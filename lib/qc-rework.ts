type QcReworkScope = {
  result?: string | null;
  reworkStage?: string | null;
  reworkTailorIds?: unknown;
} | null;

export function activeStitchingReworkTailorIds(currentStage: string, inspection: QcReworkScope) {
  if (currentStage !== "STITCHING" || inspection?.result !== "REWORK_REQUIRED" || inspection.reworkStage !== "STITCHING" || !Array.isArray(inspection.reworkTailorIds)) return [];
  return inspection.reworkTailorIds.filter((item): item is string => typeof item === "string");
}
