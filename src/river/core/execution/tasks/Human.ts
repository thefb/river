import { TASK_TYPE_HUMAN } from "../../../common/metadata/tasks/TaskType"
import { WorkflowModel } from "../../model/WorkflowModel"
import { WorkflowExecutor } from "../WorkflowExecutor"

export class Human extends WorkflowSystemTask {
  constructor () {
    super(TASK_TYPE_HUMAN)
  }

  start (
    workflow: WorkflowModel,
    task: TaskModel,
    workflowExecutor: WorkflowExecutor
  ): void {
    task.setStatus(IN_PROGRESS)
  }

  cancel (
    workflow: WorkflowModel,
    task: TaskModel,
    workflowExecutor: WorkflowExecutor
  ): void {
    task.setStatus(TaskModel.Status.CANCELED)
  }
}
