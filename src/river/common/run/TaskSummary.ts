import { hash } from "../../utils";
import { Task, TaskStatus } from "../metadata/tasks/Task";

class TaskSummary {
    public workflowId: string;
    public workflowType: string;
    public correlationId: string;
    public scheduledTime: string;
    public startTime: string;
    public updateTime: string;
    public endTime: string;
    public status: TaskStatus;
    public reasonForIncompletion: string;
    public executionTime: number;
    public queueWaitTime: number;
    public taskDefName: string;
    public taskType: string;
    public input: string;
    public output: string;
    public taskId: string;
    public externalInputPayloadStoragePath: string;
    public externalOutputPayloadStoragePath: string;
    public workflowPriority: number;
    public domain: string;
  
    constructor(task: Task) {
      this.taskId = task.taskId;
      this.taskDefName = task.taskDefName;
      this.taskType = task.taskType;
      this.workflowId = task.workflowInstanceId;
      this.workflowType = task.workflowType;
      this.workflowPriority = task.workflowPriority;
      this.correlationId = task.correlationId;
      this.scheduledTime = new Date(task.scheduledTime).toISOString();
      this.startTime = new Date(task.startTime).toISOString();
      this.updateTime = new Date(task.updateTime).toISOString();
      this.endTime = new Date(task.endTime).toISOString();
      this.status = task.status;
      this.reasonForIncompletion = task.reasonForIncompletion;
      this.queueWaitTime = task.getQueueWaitTime();
      this.domain = task.domain;
      if (task.inputData !== null) {
        this.input = SummaryUtil.serializeInputOutput(task.inputData);
      }
  
      if (task.outputData !== null) {
        this.output = SummaryUtil.serializeInputOutput(task.outputData);
      }
  
      if (task.endTime > 0) {
        this.executionTime = task.endTime - task.startTime;
      }
  
      if (StringUtils.isNotBlank(task.externalInputPayloadStoragePath)) {
        this.externalInputPayloadStoragePath = task.externalInputPayloadStoragePath;
      }
      if (StringUtils.isNotBlank(task.externalOutputPayloadStoragePath)) {
        this.externalOutputPayloadStoragePath = task.externalOutputPayloadStoragePath;
      }
    }
  
    equals(other: TaskSummary): boolean {
      if (this === other) {
        return true;
      }
      if (other === null || !(other instanceof TaskSummary)) {
        return false;
      }
      return (
        this.executionTime === other.executionTime &&
        this.queueWaitTime === other.queueWaitTime &&
        this.workflowPriority === other.workflowPriority &&
        this.workflowId === other.workflowId &&
        this.workflowType === other.workflowType &&
        this.correlationId === other.correlationId &&
        this.scheduledTime === other.scheduledTime &&
        this.startTime === other.startTime &&
        this.updateTime === other.updateTime &&
        this.endTime === other.endTime &&
        this.status === other.status &&
        this.reasonForIncompletion === other.reasonForIncompletion &&
        this.taskDefName === other.taskDefName &&
        this.taskType === other.taskType &&
        this.taskId === other.taskId &&
        this.domain === other.domain
      );
    }
  
    hashCode(): number {
      return hash(
        this.workflowId,
        this.workflowType,
        this.correlationId,
        this.scheduledTime,
        this.startTime,
        this.updateTime,
        this.endTime,
        this.status,
        this.reasonForIncompletion,
        this.executionTime,
        this.queueWaitTime,
        this.taskDefName,
        this.taskType,
        this.taskId,
        this.workflowPriority,
        this.domain
      );
    }
  }
  