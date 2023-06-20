import { WorkflowTask } from '../../../common/metadata/workflow/WorkflowTask'
import { WorkflowModel } from '../../model/WorkflowModel'
import { WorkflowExecutor } from '../WorkflowExecutor'

export abstract class WorkflowSystemTask {
  private readonly taskType: string

  constructor (taskType: string) {
    this.taskType = taskType
  }

  public start (
    workflow: WorkflowModel,
    task: TaskModel,
    workflowExecutor: WorkflowExecutor
  ): void {
    // Do nothing unless overridden by the task implementation
  }

  public execute (
    workflow: WorkflowModel,
    task: TaskModel,
    workflowExecutor: WorkflowExecutor
  ): boolean {
    return false
  }

  public cancel (
    workflow: WorkflowModel,
    task: TaskModel,
    workflowExecutor: WorkflowExecutor
  ): void {}

  public getEvaluationOffset (
    taskModel: TaskModel,
    defaultOffset: number
  ): Optional<number> {
    return Optional.empty()
  }

  public isAsync (): boolean {
    return false
  }

  public isAsyncComplete (task: TaskModel): boolean {
    if (task.getInputData().has('asyncComplete')) {
      return Optional.ofNullable(task.getInputData().get('asyncComplete'))
        .map((result: any) => result as boolean)
        .orElse(false)
    } else {
      return Optional.ofNullable(task.getWorkflowTask())
        .map((workflowTask: WorkflowTask) => workflowTask.isAsyncComplete())
        .orElse(false)
    }
  }

  public getTaskType (): string {
    return this.taskType
  }

  public isTaskRetrievalRequired (): boolean {
    return true
  }

  public toString (): string {
    return this.taskType
  }
}
