import { TASK_TYPE_TERMINATE } from '../../../common/metadata/tasks/TaskType'
import { WorkflowModel } from '../../model/WorkflowModel'
import { WorkflowExecutor } from '../WorkflowExecutor'

export class Terminate extends WorkflowSystemTask {
  private static readonly TERMINATION_STATUS_PARAMETER: string =
    'terminationStatus'
  private static readonly TERMINATION_REASON_PARAMETER: string =
    'terminationReason'
  private static readonly TERMINATION_WORKFLOW_OUTPUT: string = 'workflowOutput'

  constructor () {
    super(TASK_TYPE_TERMINATE)
  }

  public execute (
    workflow: WorkflowModel,
    task: TaskModel,
    workflowExecutor: WorkflowExecutor
  ): boolean {
    const returnStatus = task.getInputData()[
      Terminate.TERMINATION_STATUS_PARAMETER
    ] as string

    if (this.validateInputStatus(returnStatus)) {
      task.setOutputData(this.getInputFromParam(task.getInputData()))
      task.setStatus(TaskModel.Status.COMPLETED)
      return true
    }
    task.setReasonForIncompletion('given termination status is not valid')
    task.setStatus(TaskModel.Status.FAILED)
    return false
  }

  public static getTerminationStatusParameter (): string {
    return Terminate.TERMINATION_STATUS_PARAMETER
  }

  public static getTerminationReasonParameter (): string {
    return Terminate.TERMINATION_REASON_PARAMETER
  }

  public static getTerminationWorkflowOutputParameter (): string {
    return Terminate.TERMINATION_WORKFLOW_OUTPUT
  }

  public static validateInputStatus (status: string): boolean {
    return (
      status === TaskModel.Status.COMPLETED.name ||
      status === TaskModel.Status.FAILED.name ||
      status === TaskModel.Status.TERMINATED.name
    )
  }

  private getInputFromParam (
    taskInput: Map<string, object>
  ): Map<string, object> {
    const output: Map<string, object> = new Map<string, object>()
    if (taskInput.get(Terminate.TERMINATION_WORKFLOW_OUTPUT) === null) {
      return output
    }
    if (taskInput.get(Terminate.TERMINATION_WORKFLOW_OUTPUT) instanceof Map) {
      output.set(
        ...Array.from(
          taskInput.get(Terminate.TERMINATION_WORKFLOW_OUTPUT) as Map<
            string,
            object
          >
        )
      )
      return output
    }
    output.set('output', taskInput.get(Terminate.TERMINATION_WORKFLOW_OUTPUT))
    return output
  }
}
