import { hash } from "../../../utils";
import { BaseDef } from "../BaseDef";
import crypto from 'crypto';

export class WorkflowDef extends BaseDef {
  name: string;
  description?: string;
  version = 1;
  tasks: WorkflowTask[] = [];
  inputParameters: string[] = [];
  outputParameters: Record<string, any> = {};
  failureWorkflow?: string;
  schemaVersion = 2;
  restartable = true;
  workflowStatusListenerEnabled = false;
  ownerEmail?: string;
  timeoutPolicy: TimeoutPolicy = TimeoutPolicy.ALERT_ONLY;
  timeoutSeconds: number;
  variables: Record<string, any> = {};
  inputTemplate: Record<string, any> = {};

  static getKey(name: string, version: number): string {
    return `${name}.${version}`;
  }

  containsType(taskType: string): boolean {
    return this.collectTasks().some((t) => t.type === taskType);
  }

  getNextTask(taskReferenceName: string): WorkflowTask | null {
    const workflowTask = this.getTaskByRefName(taskReferenceName);
    if (workflowTask != null && workflowTask.type === TaskType.TERMINATE) {
      return null;
    }

    const iterator = this.tasks[Symbol.iterator]();
    for (const task of iterator) {
      if (task.taskReferenceName === taskReferenceName) {
        // If taskReferenceName matches, break out
        break;
      }
      const nextTask = task.next(taskReferenceName, null);
      if (nextTask != null) {
        return nextTask;
      } else if (
        task.type === TaskType.DO_WHILE &&
        task.taskReferenceName !== taskReferenceName &&
        task.has(taskReferenceName)
      ) {
        // If the task is child of Loop Task and at last position, return null.
        return null;
      }

      if (task.has(taskReferenceName)) {
        break;
      }
    }
    const next = iterator.next();
    if (!next.done) {
      return next.value;
    }
    return null;
  }

  getTaskByRefName(taskReferenceName: string): WorkflowTask | null {
    return this.collectTasks().find(
      (workflowTask) => workflowTask.taskReferenceName === taskReferenceName
    ) ?? null;
  }

  collectTasks(): WorkflowTask[] {
    const tasks: WorkflowTask[] = [];
    for (const workflowTask of this.tasks) {
      tasks.push(...workflowTask.collectTasks());
    }
    return tasks;
  }

  equals(other: WorkflowDef): boolean {
    if (this === other) {
      return true;
    }
    if (!(other instanceof WorkflowDef)) {
      return false;
    }
    return (
      this.version === other.version &&
      this.schemaVersion === other.schemaVersion &&
      this.name === other.name &&
      this.description === other.description &&
      this.tasks === other.tasks &&
      this.inputParameters === other.inputParameters &&
      this.outputParameters === other.outputParameters &&
      this.failureWorkflow === other.failureWorkflow &&
      this.ownerEmail === other.ownerEmail &&
      this.timeoutSeconds === other.timeoutSeconds
    );
  }

  hashCode(): number {
    return hash(
      this.name,
      this.description,
      this.version,
      this.tasks,
      this.inputParameters,
      this.outputParameters,
      this.failureWorkflow,
      this.schemaVersion,
      this.ownerEmail,
      this.timeoutSeconds
    );
  }

  toString(): string {
    return `WorkflowDef{name='${this.name}', description='${this.description}', version=${this.version}, tasks=${this.tasks}, inputParameters=${this.inputParameters}, outputParameters=${this.outputParameters}, failureWorkflow='${this.failureWorkflow}', schemaVersion=${this.schemaVersion}, restartable=${this.restartable}, workflowStatusListenerEnabled=${this.workflowStatusListenerEnabled}, timeoutSeconds=${this.timeoutSeconds}}`;
  }
}

export enum TimeoutPolicy {
  TIME_OUT_WF = 'TIME_OUT_WF',
  ALERT_ONLY = 'ALERT_ONLY'
}

export enum TaskType {
  TERMINATE = 'TERMINATE',
  DO_WHILE = 'DO_WHILE'
}



