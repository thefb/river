export class WorkflowExecutor {
  constructor () {}

  resetCallbacksFromWorkflow (workflowId: string): void {
    const workflow: WorkflowModel = this.executionDAOFacade.getWorkflowModel(
      workflowId,
      true
    )
    if (workflow.getStatus().isTerminal()) {
      throw new ConflictException(
        `Workflow is in terminal state. Status = ${workflow.getStatus()}`
      )
    }

    workflow
      .getTasks()
      .stream()
      .filter(
        task =>
          !this.systemTaskRegistry(task.getTaskId()) &&
          SCHEDULED === task.getStatus() &&
          task.getCallbackAfterSeconds() > 0
      )
      .forEach(task => {
        if (this.queueDAO.resetOffsetTime(QueueUtils.getQueueName(task))) {
          this.executionDAOFacade.updateTask(task)
        }
  }
}
