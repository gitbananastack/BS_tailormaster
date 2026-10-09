type Status = "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "NOT_REQUIRED" | "CANCELLED";

export function firstStageUpdateAllowed(hasCurrentStageUpdate: boolean, requestedStatus: Status) {
  return hasCurrentStageUpdate || requestedStatus === "IN_PROGRESS";
}

export function handoffState<TStage extends string>(advancedStage: TStage | null, requestedStatus: Status, eta: Date | null) {
  return advancedStage
    ? { status: "CREATED" as const, currentStage: advancedStage, estimatedCompletion: null }
    : { status: requestedStatus, currentStage: null, estimatedCompletion: eta };
}
