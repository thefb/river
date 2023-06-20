import { WorkflowModel } from '../model/WorkflowModel'

export interface WorkflowStatusListener {
  onWorkflowCompletedIfEnabled(workflow: WorkflowModel): void
  onWorkflowTerminatedIfEnabled(workflow: WorkflowModel): void
  onWorkflowFinalizedIfEnabled(workflow: WorkflowModel): void
  onWorkflowCompleted(workflow: WorkflowModel): void
  onWorkflowTerminated(workflow: WorkflowModel): void
  onWorkflowFinalized(workflow: WorkflowModel): void
}
