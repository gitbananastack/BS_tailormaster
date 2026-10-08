import { hasAnyRole, canWorkStage } from "@/lib/roles";
import { ProductionStage, QcResult } from "@prisma/client";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const maxPhotoSize = 10 * 1024 * 1024;

function storedPhotoPaths(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [value];
  } catch {
    return [value];
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return Response.json({ error: "Sign in to submit QC." }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, select: { currentStage: true, items: { select: { designCode: true } }, assignments: { where: { stage: "STITCHING" }, select: { userId: true } }, qcInspection: { select: { defectPhotoPath: true } } } });
  const manager = hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"]);
  const assignment = await prisma.orderAssignment.findFirst({ where: { orderId: id, stage: "QUALITY_CHECK", userId: actor.id } });
  if (!order || (!manager && (order.currentStage !== "QUALITY_CHECK" || !canWorkStage(actor, "QUALITY_CHECK", assignment?.userId)))) {
    return Response.json({ error: "Only the assigned QC inspector can submit this inspection." }, { status: 403 });
  }

  const data = await request.formData();
  const result = String(data.get("result") || "PENDING");
  if (!["PASSED", "REWORK_REQUIRED", "REJECTED"].includes(result)) return Response.json({ error: "Choose a QC result." }, { status: 400 });

  const reason = String(data.get("reason") || "").trim();
  const reworkStage = String(data.get("reworkStage") || "");
  const reworkTailorIds = [...new Set(data.getAll("reworkTailorIds").map(String).filter(Boolean))];
  const reworkDesignCodes = [...new Set(data.getAll("reworkDesignCodes").map(String).filter(Boolean))];
  if (["REWORK_REQUIRED", "REJECTED"].includes(result) && !reason) return Response.json({ error: "A rejection or rework reason is required." }, { status: 400 });
  if (result === "REWORK_REQUIRED" && !["CUTTING", "STITCHING", "QUALITY_CHECK"].includes(reworkStage)) return Response.json({ error: "Choose the stage for rework." }, { status: 400 });
  if (result === "REWORK_REQUIRED" && reworkStage === "STITCHING") {
    const allowedTailors = new Set(order.assignments.map(item => item.userId));
    const allowedDesigns = new Set(order.items.map(item => item.designCode?.trim()).filter(Boolean));
    if (!reworkTailorIds.length || reworkTailorIds.some(userId => !allowedTailors.has(userId))) return Response.json({ error: "Select at least one tailor already assigned to this order." }, { status: 400 });
    if (!reworkDesignCodes.length || reworkDesignCodes.some(code => !allowedDesigns.has(code))) return Response.json({ error: "Select at least one valid design code for rework." }, { status: 400 });
  }

  const uploadedFiles = [...data.getAll("photos"), ...data.getAll("photo")].filter((item): item is File => item instanceof File && item.size > 0);
  const invalidFile = uploadedFiles.find((file) => !file.type.startsWith("image/") || file.size > maxPhotoSize);
  if (invalidFile) return Response.json({ error: `Each photo must be an image of 10 MB or smaller. ${invalidFile.name} was not uploaded.` }, { status: 400 });

  let defectPhotoPath: string | undefined;
  if (uploadedFiles.length) {
    const settings = await prisma.appSetting.findMany({ where: { key: { in: ["photoStorageFolder", "photoStoragePublicUrl"] } } });
    const values = new Map(settings.map((row) => [row.key, row.value]));
    const folder = values.get("photoStorageFolder") || "public/uploads/qc";
    const publicUrl = values.get("photoStoragePublicUrl") || "/uploads/qc";
    const target = path.resolve(process.cwd(), folder);
    if (!target.startsWith(process.cwd())) return Response.json({ error: "Invalid photo storage folder." }, { status: 400 });

    await mkdir(target, { recursive: true });
    const newPaths = await Promise.all(uploadedFiles.map(async (file) => {
      const extension = file.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "jpg";
      const filename = `${id}-${randomUUID()}.${extension}`;
      await writeFile(path.join(target, filename), Buffer.from(await file.arrayBuffer()));
      return `${publicUrl.replace(/\/$/, "")}/${filename}`;
    }));
    defectPhotoPath = JSON.stringify([...storedPhotoPaths(order.qcInspection?.defectPhotoPath), ...newPaths]);
  }

  const inspection = await prisma.qcInspection.upsert({
    where: { orderId: id },
    create: {
      orderId: id,
      inspectorId: actor.id,
      result: result as QcResult,
      stitchingPassed: data.get("stitching") === "true",
      measurementPassed: data.get("measurement") === "true",
      finishingPassed: data.get("finishing") === "true",
      rejectionReason: reason || null,
      reworkStage: result === "REWORK_REQUIRED" ? reworkStage as ProductionStage : null,
      reworkTailorIds: result === "REWORK_REQUIRED" && reworkStage === "STITCHING" ? reworkTailorIds : [],
      reworkDesignCodes: result === "REWORK_REQUIRED" ? reworkDesignCodes : [],
      defectPhotoPath,
    },
    update: {
      inspectorId: actor.id,
      result: result as QcResult,
      stitchingPassed: data.get("stitching") === "true",
      measurementPassed: data.get("measurement") === "true",
      finishingPassed: data.get("finishing") === "true",
      rejectionReason: reason || null,
      reworkStage: result === "REWORK_REQUIRED" ? reworkStage as ProductionStage : null,
      reworkTailorIds: result === "REWORK_REQUIRED" && reworkStage === "STITCHING" ? reworkTailorIds : [],
      reworkDesignCodes: result === "REWORK_REQUIRED" ? reworkDesignCodes : [],
      ...(defectPhotoPath ? { defectPhotoPath } : {}),
    },
  });

  if (result === "REWORK_REQUIRED") await prisma.order.update({ where: { id }, data: { currentStage: reworkStage as "CUTTING" | "STITCHING" | "QUALITY_CHECK", status: "IN_PROGRESS" } });
  return Response.json({ ...inspection, defectPhotoPath: inspection.defectPhotoPath });
}
