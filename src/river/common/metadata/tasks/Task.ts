import { deepEquals } from "../../../utils"
import { WorkflowTask } from "../workflow/WorkflowTask"
import { TaskDef } from "./TaskDef"

enum TaskStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  CANCELED = 'CANCELED',
  FAILED = 'FAILED',
  FAILED_WITH_TERMINAL_ERROR = 'FAILED_WITH_TERMINAL_ERROR',
  COMPLETED = 'COMPLETED',
  COMPLETED_WITH_ERRORS = 'COMPLETED_WITH_ERRORS',
  SCHEDULED = 'SCHEDULED',
  TIMED_OUT = 'TIMED_OUT',
  SKIPPED = 'SKIPPED'
}

class Task {
  taskType: string
  status: TaskStatus
  inputData: Record<string, any>
  referenceTaskName: string
  retryCount: number
  seq: number
  correlationId: string
  pollCount: number
  taskDefName: string
  scheduledTime: number
  startTime: number
  endTime: number
  updateTime: number
  startDelayInSeconds: number
  retriedTaskId: string
  retried: boolean
  executed: boolean
  callbackFromWorker: boolean
  responseTimeoutSeconds: number
  workflowInstanceId: string
  workflowType: string
  taskId: string
  reasonForIncompletion: string
  callbackAfterSeconds: number
  workerId: string
  outputData: Record<string, any>
  workflowTask: WorkflowTask
  domain: string
  inputMessage: any
  outputMessage: any
  rateLimitPerFrequency: number
  rateLimitFrequencyInSeconds: number
  externalInputPayloadStoragePath: string
  externalOutputPayloadStoragePath: string
  workflowPriority: number
  executionNameSpace: string
  isolationGroupId: string
  iteration: number
  subWorkflowId: string | null
  subworkflowChanged: boolean

  constructor () {
    this.inputData = {}
    this.outputData = {}
  }

  setInputData (inputData: Record<string, any>): void {
    if (inputData == null) {
      inputData = {}
    }
    this.inputData = inputData
  }

  getQueueWaitTime(): number {
    if (this.startTime > 0 && this.scheduledTime > 0) {
      if (this.updateTime > 0 && this.callbackAfterSeconds > 0) {
        const waitTime =
          Date.now() -
          (this.updateTime + this.callbackAfterSeconds * 1000);
        return waitTime > 0 ? waitTime : 0;
      } else {
        return this.startTime - this.scheduledTime;
      }
    }
    return 0;
  }

  getTaskDefName(): string {
    if (!this.taskDefName || this.taskDefName === "") {
      this.taskDefName = this.taskType;
    }
    return this.taskDefName;
  }

  setReasonForIncompletion(reasonForIncompletion: string): void {
    this.reasonForIncompletion = reasonForIncompletion.substring(0, 500);
  }

  setOutputData(outputData: Record<string, any>): void {
    if (outputData == null) {
      outputData = {};
    }
    this.outputData = outputData;
  }

  getTaskDefinition(): TaskDef | undefined {
    return this.workflowTask?.taskDefinition;
  }

  isLoopOverTask(): boolean {
    return this.iteration > 0;
  }

  getSubWorkflowId(): string | null {
    // For backwards compatibility
    if (this.subWorkflowId && this.subWorkflowId.trim() !== '') {
      return this.subWorkflowId;
    } else {
      if (
        this.outputData &&
        this.outputData['subWorkflowId'] &&
        typeof this.outputData['subWorkflowId'] === 'string'
      ) {
        return this.outputData['subWorkflowId'];
      } else if (
        this.inputData &&
        this.inputData['subWorkflowId'] &&
        typeof this.inputData['subWorkflowId'] === 'string'
      ) {
        return this.inputData['subWorkflowId'];
      } else {
        return null;
      }
    }
  }

  setSubWorkflowId(subWorkflowId: string): void {
    this.subWorkflowId = subWorkflowId;
    // For backwards compatibility
    if (Object.prototype.hasOwnProperty.call(this.outputData, 'subWorkflowId')) {
      this.outputData['subWorkflowId'] = subWorkflowId;
    }
  }
  

  copy(): Task {
    const copy = new Task();
    copy.callbackAfterSeconds = this.callbackAfterSeconds;
    copy.callbackFromWorker = this.callbackFromWorker;
    copy.correlationId = this.correlationId;
    copy.inputData = { ...this.inputData };
    copy.outputData = { ...this.outputData };
    copy.referenceTaskName = this.referenceTaskName;
    copy.startDelayInSeconds = this.startDelayInSeconds;
    copy.taskDefName = this.taskDefName;
    copy.taskType = this.taskType;
    copy.workflowInstanceId = this.workflowInstanceId;
    copy.workflowType = this.workflowType;
    copy.responseTimeoutSeconds = this.responseTimeoutSeconds;
    copy.status = this.status;
    copy.retryCount = this.retryCount;
    copy.pollCount = this.pollCount;
    copy.taskId = this.taskId;
    copy.workflowTask = this.workflowTask;
    copy.domain = this.domain;
    copy.inputMessage = this.inputMessage;
    copy.outputMessage = this.outputMessage;
    copy.rateLimitPerFrequency = this.rateLimitPerFrequency;
    copy.rateLimitFrequencyInSeconds = this.rateLimitFrequencyInSeconds;
    copy.externalInputPayloadStoragePath = this.externalInputPayloadStoragePath;
    copy.externalOutputPayloadStoragePath = this.externalOutputPayloadStoragePath;
    copy.workflowPriority = this.workflowPriority;
    copy.iteration = this.iteration;
    copy.executionNameSpace = this.executionNameSpace;
    copy.isolationGroupId = this.isolationGroupId;
    copy.subWorkflowId = this.getSubWorkflowId();
    copy.subworkflowChanged = this.subworkflowChanged;

    return copy;
  }

  deepCopy(): Task {
    const deepCopy = this.copy();
    deepCopy.startTime = this.startTime;
    deepCopy.scheduledTime = this.scheduledTime;
    deepCopy.endTime = this.endTime;
    deepCopy.workerId = this.workerId;
    deepCopy.reasonForIncompletion = this.reasonForIncompletion;
    deepCopy.seq = this.seq;

    return deepCopy;
  }

  toString(): string {
    return `Task{` +
      `taskType='${this.taskType}', ` +
      `status=${this.status}, ` +
      `inputData=${JSON.stringify(this.inputData)}, ` +
      `referenceTaskName='${this.referenceTaskName}', ` +
      `retryCount=${this.retryCount}, ` +
      `seq=${this.seq}, ` +
      `correlationId='${this.correlationId}', ` +
      `pollCount=${this.pollCount}, ` +
      `taskDefName='${this.taskDefName}', ` +
      `scheduledTime=${this.scheduledTime}, ` +
      `startTime=${this.startTime}, ` +
      `endTime=${this.endTime}, ` +
      `updateTime=${this.updateTime}, ` +
      `startDelayInSeconds=${this.startDelayInSeconds}, ` +
      `retriedTaskId='${this.retriedTaskId}', ` +
      `retried=${this.retried}, ` +
      `executed=${this.executed}, ` +
      `callbackFromWorker=${this.callbackFromWorker}, ` +
      `responseTimeoutSeconds=${this.responseTimeoutSeconds}, ` +
      `workflowInstanceId='${this.workflowInstanceId}', ` +
      `workflowType='${this.workflowType}', ` +
      `taskId='${this.taskId}', ` +
      `reasonForIncompletion='${this.reasonForIncompletion}', ` +
      `callbackAfterSeconds=${this.callbackAfterSeconds}, ` +
      `workerId='${this.workerId}', ` +
      `outputData=${JSON.stringify(this.outputData)}, ` +
      `workflowTask=${JSON.stringify(this.workflowTask)}, ` +
      `domain='${this.domain}', ` +
      `inputMessage='${this.inputMessage}', ` +
      `outputMessage='${this.outputMessage}', ` +
      `rateLimitPerFrequency=${this.rateLimitPerFrequency}, ` +
      `rateLimitFrequencyInSeconds=${this.rateLimitFrequencyInSeconds}, ` +
      `workflowPriority=${this.workflowPriority}, ` +
      `externalInputPayloadStoragePath='${this.externalInputPayloadStoragePath}', ` +
      `externalOutputPayloadStoragePath='${this.externalOutputPayloadStoragePath}', ` +
      `isolationGroupId='${this.isolationGroupId}', ` +
      `executionNameSpace='${this.executionNameSpace}', ` +
      `subworkflowChanged='${this.subworkflowChanged}'` +
      `}`;
  }

  equals(o: any): boolean {
    if (this === o) {
      return true;
    }
    if (o === null || !(o instanceof Task)) {
      return false;
    }
    const task: Task = o;
    return (
      this.retryCount === task.retryCount &&
      this.seq === task.seq &&
      this.pollCount === task.pollCount &&
      this.scheduledTime === task.scheduledTime &&
      this.startTime === task.startTime &&
      this.endTime === task.endTime &&
      this.updateTime === task.updateTime &&
      this.startDelayInSeconds === task.startDelayInSeconds &&
      this.retried === task.retried &&
      this.executed === task.executed &&
      this.callbackFromWorker === task.callbackFromWorker &&
      this.responseTimeoutSeconds === task.responseTimeoutSeconds &&
      this.callbackAfterSeconds === task.callbackAfterSeconds &&
      this.rateLimitPerFrequency === task.rateLimitPerFrequency &&
      this.rateLimitFrequencyInSeconds === task.rateLimitFrequencyInSeconds &&
      this.taskType === task.taskType &&
      this.status === task.status &&
      this.iteration === task.iteration &&
      this.workflowPriority === task.workflowPriority &&
      deepEquals(this.setInputData, task.setInputData) &&
      this.referenceTaskName === task.referenceTaskName &&
      this.correlationId === task.correlationId &&
      this.getTaskDefName === task.getTaskDefName &&
      this.retriedTaskId === task.retriedTaskId &&
      this.workflowInstanceId === task.workflowInstanceId &&
      this.workflowType === task.workflowType &&
      this.taskId === task.taskId &&
      this.setReasonForIncompletion === task.setReasonForIncompletion &&
      this.workerId === task.workerId &&
      deepEquals(this.setOutputData, task.setOutputData) &&
      deepEquals(this.workflowTask, task.workflowTask) &&
      this.domain === task.domain &&
      deepEquals(this.inputMessage, task.inputMessage) &&
      deepEquals(this.outputMessage, task.outputMessage) &&
      this.externalInputPayloadStoragePath === task.externalInputPayloadStoragePath &&
      this.externalOutputPayloadStoragePath === task.externalOutputPayloadStoragePath &&
      this.isolationGroupId === task.isolationGroupId &&
      this.executionNameSpace === task.executionNameSpace
    );
  }

  hashCode(): number {
    return this.calculateHashCode(
      this.taskType,
      this.status,
      this.setInputData,
      this.referenceTaskName,
      this.workflowPriority,
      this.retryCount,
      this.seq,
      this.correlationId,
      this.pollCount,
      this.getTaskDefName,
      this.scheduledTime,
      this.startTime,
      this.endTime,
      this.updateTime,
      this.startDelayInSeconds,
      this.retriedTaskId,
      this.retried,
      this.executed,
      this.callbackFromWorker,
      this.responseTimeoutSeconds,
      this.workflowInstanceId,
      this.workflowType,
      this.taskId,
      this.setReasonForIncompletion,
      this.callbackAfterSeconds,
      this.workerId,
      this.setOutputData,
      this.workflowTask,
      this.domain,
      this.inputMessage,
      this.outputMessage,
      this.rateLimitPerFrequency,
      this.rateLimitFrequencyInSeconds,
      this.externalInputPayloadStoragePath,
      this.externalOutputPayloadStoragePath,
      this.isolationGroupId,
      this.executionNameSpace
    );
  }

  private calculateHashCode(...values: any[]): number {
    let result = 1;
    const prime = 31;
    for (const value of values) {
      result = prime * result + (value === null ? 0 : this.calculateValueHashCode(value));
    }
    return result;
  }

  private calculateValueHashCode(value: any): number {
    if (typeof value === 'object' && value !== null) {
      return this.calculateHashCode(...Object.values(value));
    } else {
      return this.calculatePrimitiveHashCode(value);
    }
  }

  private calculatePrimitiveHashCode(value: any): number {
    if (typeof value === 'string') {
      return this.calculateStringHashCode(value);
    } else if (typeof value === 'number') {
      return this.calculateNumberHashCode(value);
    } else if (typeof value === 'boolean') {
      return value ? 1231 : 1237;
    } else {
      return 0;
    }
  }

  private calculateStringHashCode(value: string): number {
    let result = 0;
    for (let i = 0; i < value.length; i++) {
      result = (result << 5) - result + value.charCodeAt(i);
      result = result & result; // Convert to 32bit integer
    }
    return result;
  }

  private calculateNumberHashCode(value: number): number {
    const intValue = Math.floor(value);
    return intValue === value ? intValue : 0;
  }
}

export { Task, TaskStatus }
