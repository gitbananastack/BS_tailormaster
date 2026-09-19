export const workflowStages = [
  { key: "CUTTING", label: "Cutting", description: "Fabric cut per BOM" },
  { key: "STITCHING", label: "Stitching", description: "Assembly and sewing" },
  { key: "QUALITY_CHECK", label: "Quality Check", description: "Inspection and rework decision" },
  { key: "PACKING", label: "Packing", description: "Final packing" },
  { key: "DELIVERY", label: "Delivery", description: "Dispatch to customer" },
] as const;

export type WorkflowStageKey = (typeof workflowStages)[number]["key"];

export function workflowLabel(stage: WorkflowStageKey) {
  return workflowStages.find((item) => item.key === stage)?.label ?? stage;
}
