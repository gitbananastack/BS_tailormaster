import type { Prisma, BatchStatus, ProductionStage } from "@prisma/client";
export type ListParams = { q?: string; status?: string; stage?: string; role?: string; page?: string };
export const statusOptions = ["CREATED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"].map(value => ({ value, label: value.replaceAll("_", " ").toLowerCase() }));
export const stageOptions = [{ value: "CUTTING", label: "Cutting" }, { value: "FUSING", label: "Fusing" }, { value: "STITCHING", label: "Stitching" }, { value: "QUALITY_CHECK", label: "QC" }, { value: "PACKING", label: "Packing" }, { value: "DELIVERY", label: "Delivery" }];
export const orderFilterFields = [{ name: "status", label: "Status", options: statusOptions }, { name: "stage", label: "Stage", options: stageOptions }];
export function filterValues(params: ListParams): Record<string, string> { return { q: typeof params.q === "string" ? params.q.trim().slice(0,120) : "", status: typeof params.status === "string" ? params.status : "", stage: typeof params.stage === "string" ? params.stage : "", role: typeof params.role === "string" ? params.role : "" }; }
export function orderFilters(params: ListParams): Prisma.OrderWhereInput {
 const { q, status, stage } = filterValues(params);
 return { ...(q ? { OR: [{ orderNumber: { contains: q } }, { items: { some: { designCode: { contains: q } } } }, { garmentName: { contains: q } }, { processName: { contains: q } }, { customer: { name: { contains: q } } }] } : {}), ...(statusOptions.some(option => option.value === status) ? { status: status as BatchStatus } : {}), ...(stageOptions.some(option => option.value === stage) ? { currentStage: stage as ProductionStage } : {}) };
}
export function pageNumber(value: string | undefined, total: number, size: number) { const parsed = Number(value); return Math.min(Math.max(1, Math.ceil(total / size)), Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1); }
