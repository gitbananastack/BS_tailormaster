import { workflowStages, type WorkflowStageKey } from "@/lib/workflow";

export function StageProgress({ current }: { current: WorkflowStageKey }) {
  const activeIndex = workflowStages.findIndex((stage) => stage.key === current);

  return (
    <ol className="progress" aria-label="Production progress">
      {workflowStages.map((stage, index) => (
        <li key={stage.key} className={index <= activeIndex ? "done" : ""}>
          <span>{index + 1}</span><strong>{stage.label}</strong>
        </li>
      ))}
    </ol>
  );
}
