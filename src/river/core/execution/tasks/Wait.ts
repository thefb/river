import { TASK_TYPE_WAIT } from "../../../common/metadata/tasks/TaskType"
import { WorkflowModel } from "../../model/WorkflowModel"
import { WorkflowExecutor } from "../WorkflowExecutor"

export class Wait extends WorkflowSystemTask {
  public static readonly DURATION_INPUT: string = 'duration'
  public static readonly UNTIL_INPUT: string = 'until'

  constructor () {
    super(TASK_TYPE_WAIT)
  }

  public start (
    workflow: Workflow
    Model,
    task: TaskModel,
    workflowExecutor: WorkflowExecutor
  ): void {
    const duration: string = (
      task.getInputData()[Wait.DURATION_INPUT] || ''
    ).toString()
    const until: string = (
      task.getInputData()[Wait.UNTIL_INPUT] || ''
    ).toString()

    if (StringUtils.isNotBlank(duration) && StringUtils.isNotBlank(until)) {
      task.setReasonForIncompletion(
        "Both 'duration' and 'until' specified. Please provide only one input"
      )
      task.setStatus(TaskModel.Status.FAILED_WITH_TERMINAL_ERROR)
      return
    }

    if (StringUtils.isNotBlank(duration)) {
      const timeDuration: Duration = parseDuration(duration)
      const waitTimeout: number = Date.now() + timeDuration.getSeconds() * 1000
      task.setWaitTimeout(waitTimeout)

      const seconds: number = timeDuration.getSeconds()
      task.setCallbackAfterSeconds(seconds)
    } else if (StringUtils.isNotBlank(until)) {
      try {
        const expiryDate: Date = parseDate(until)
        const timeInMS: number = expiryDate.getTime()
        const now: number = Date.now()
        const seconds: number = (timeInMS - now) / 1000
        task.setWaitTimeout(timeInMS)
      } catch (parseException) {
        task.setReasonForIncompletion(
          'Invalid/Unsupported Wait Until format.  Provided: ' + until
        )
        task.setStatus(TaskModel.Status.FAILED_WITH_TERMINAL_ERROR)
      }
    }
    task.setStatus(TaskModel.Status.IN_PROGRESS)
  }

  public cancel (
    workflow: WorkflowModel,
    task: TaskModel,
    workflowExecutor: WorkflowExecutor
  ): void {
    task.setStatus(TaskModel.Status.CANCELED)
  }

  public execute (
    workflow: WorkflowModel,
    task: TaskModel,
    workflowExecutor: WorkflowExecutor
  ): boolean {
    const timeOut: number = task.getWaitTimeout()
    if (timeOut === 0) {
      return false
    }
    if (Date.now() > timeOut) {
      task.setStatus(TaskModel.Status.COMPLETED)
      return true
    }
    return false
  }
}
