import { WorkflowModel, TaskModel, WorkflowExecutor } from '...' // Import the required dependencies

class Switch extends WorkflowSystemTask {
  constructor () {
    super(TASK_TYPE_SWITCH)
  }

  execute (
    workflow: WorkflowModel,
    task: TaskModel,
    workflowExecutor: WorkflowExecutor
  ): boolean {
    task.setStatus(TaskModel.Status.COMPLETED)
    return true
  }
}
