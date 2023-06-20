import { Task } from './Task'
import { TaskExecLog } from './TaskExecLog'

export enum Status {
  IN_PROGRESS = 'IN_PROGRESS',
  FAILED = 'FAILED',
  FAILED_WITH_TERMINAL_ERROR = 'FAILED_WITH_TERMINAL_ERROR',
  COMPLETED = 'COMPLETED'
}

export class TaskResult {
  public workflowInstanceId: string
  public taskId: string
  public reasonForIncompletion: string
  public callbackAfterSeconds: number
  public workerId: string
  public status: Status
  public outputData: Record<string, any> = {}
  public outputMessage: any
  public logs: TaskExecLog[] = []
  public externalOutputPayloadStoragePath: string
  public subWorkflowId: string | null
  public extendLease: boolean

  constructor (task?: Task) {
    if (task) {
      this.workflowInstanceId = task.workflowInstanceId
      this.taskId = task.taskId
      this.reasonForIncompletion = task.reasonForIncompletion
      this.callbackAfterSeconds = task.callbackAfterSeconds
      this.workerId = task.workerId
      this.outputData = { ...task.outputData }
      this.externalOutputPayloadStoragePath =
        task.externalOutputPayloadStoragePath
      this.subWorkflowId = task.subWorkflowId

      switch (task.status) {
        case 'CANCELED':
        case 'COMPLETED_WITH_ERRORS':
        case 'TIMED_OUT':
        case 'SKIPPED':
          this.status = Status.FAILED
          break
        case 'SCHEDULED':
          this.status = Status.IN_PROGRESS
          break
        default:
          this.status = Status[task.status as keyof typeof Status]
          break
      }
    }
  }

  public setReasonForIncompletion (reasonForIncompletion: string): void {
    this.reasonForIncompletion = reasonForIncompletion.substring(0, 500)
  }

  public setStatus (status: Status): void {
    this.status = status
  }

  public setOutputData (outputData: Record<string, any>): void {
    this.outputData = outputData
  }

  public addOutputData (key: string, value: any): TaskResult {
    this.outputData[key] = value
    return this
  }

  public setOutputMessage (outputMessage: any): void {
    this.outputMessage = outputMessage
  }

  public setLogs (logs: TaskExecLog[]): void {
    this.logs = logs
  }

  public log (log: string): TaskResult {
    this.logs.push(new TaskExecLog(log))
    return this
  }

  public setExternalOutputPayloadStoragePath (
    externalOutputPayloadStoragePath: string
  ): void {
    this.externalOutputPayloadStoragePath = externalOutputPayloadStoragePath
  }

  public setSubWorkflowId (subWorkflowId: string): void {
    this.subWorkflowId = subWorkflowId
  }

  public setExtendLease (extendLease: boolean): void {
    this.extendLease = extendLease
  }

  public static complete (): TaskResult {
    return TaskResult.newTaskResult(Status.COMPLETED)
  }

  public static failed(): TaskResult {
    return TaskResult.newTaskResult(Status.FAILED);
  }

  public static failedWithReason(failureReason: string): TaskResult {
    const result = TaskResult.newTaskResult(Status.FAILED);
    result.setReasonForIncompletion(failureReason);
    return result;
  }

  public static inProgress (): TaskResult {
    return TaskResult.newTaskResult(Status.IN_PROGRESS)
  }

  public static newTaskResult (status: Status): TaskResult {
    const result = new TaskResult()
    result.setStatus(status)
    return result
  }

  public toString (): string {
    return `TaskResult{
        workflowInstanceId='${this.workflowInstanceId}',
        taskId='${this.taskId}',
        reasonForIncompletion='${this.reasonForIncompletion}',
        callbackAfterSeconds=${this.callbackAfterSeconds},
        workerId='${this.workerId}',
        status=${this.status},
        outputData=${JSON.stringify(this.outputData)},
        outputMessage=${this.outputMessage},
        logs=${JSON.stringify(this.logs)},
        externalOutputPayloadStoragePath='${
          this.externalOutputPayloadStoragePath
        }',
        subWorkflowId='${this.subWorkflowId}',
        extendLease=${this.extendLease}
      }`
  }
}
