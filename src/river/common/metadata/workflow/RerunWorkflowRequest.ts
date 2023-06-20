export class RerunWorkflowRequest {
  reRunFromWorkflowId: string
  workflowInput: Record<string, any>
  reRunFromTaskId: string
  taskInput: Record<string, any>
  correlationId: string
}
