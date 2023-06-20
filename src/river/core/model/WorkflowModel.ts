enum WorkflowStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  TIMED_OUT = 'TIMED_OUT',
  TERMINATED = 'TERMINATED',
  PAUSED = 'PAUSED'
}

export interface WorkflowModel {
    status: WorkflowStatus;
    endTime: number;
    workflowId: string;
    parentWorkflowId: string;
    parentWorkflowTaskId: string;
    tasks: TaskModel[];
    input: Record<string, any>;
    output: Record<string, any>;
    correlationId: string;
    reRunFromWorkflowId: string;
    reasonForIncompletion: string;
    event: string;
    taskToDomain: Record<string, string>;
    failedReferenceTaskNames: Set<string>;
    failedTaskNames: Set<string>;
    workflowDefinition: WorkflowDef;
    externalInputPayloadStoragePath: string;
    externalOutputPayloadStoragePath: string;
    priority: number;
    variables: Record<string, any>;
    lastRetriedTime: number;
    ownerApp: string;
    createTime: number;
    updatedTime: number;
    createdBy: string;
    updatedBy: string;
    failedTaskId: string;
  
    getWorkflowName(): string;
    getWorkflowVersion(): number;
    hasParent(): boolean;
    toShortString(): string;
    getTaskByRefName(refName: string): TaskModel;
    externalizeInput(path: string): void;
    externalizeOutput(path: string): void;
    internalizeInput(data: Record<string, any>): void;
    internalizeOutput(data: Record<string, any>): void;
    equals(o: any): boolean;
    hashCode(): number;
    toWorkflow(): Workflow;
    addInput(key: string, value: any): void;
    addInput(inputData: Record<string, any>): void;
    addOutput(key: string, value: any): void;
    addOutput(outputData: Record<string, any>): void;
  }

  class WorkflowModelImpl implements WorkflowModel {
    status: WorkflowStatus = WorkflowStatus.RUNNING;
    endTime = 0;
    workflowId = '';
    parentWorkflowId = '';
    parentWorkflowTaskId = '';
    tasks: TaskModel[] = [];
    input: Record<string, any> = {};
    output: Record<string, any> = {};
    correlationId = '';
    reRunFromWorkflowId = '';
    reasonForIncompletion = '';
    event = '';
    taskToDomain: Record<string, string> = {};
    failedReferenceTaskNames: Set<string> = new Set<string>();
    failedTaskNames: Set<string> = new Set<string>();
    workflowDefinition: WorkflowDef | null = null;
    externalInputPayloadStoragePath = '';
    externalOutputPayloadStoragePath = '';
    priority = 0;
    variables: Record<string, any> = {};
    lastRetriedTime = 0;
    ownerApp = '';
    createTime = 0;
    updatedTime = 0;
    createdBy = '';
    updatedBy = '';
    failedTaskId = '';
  
    getWorkflowName(): string {
      return this.workflowDefinition?.name || '';
    }
  
    getWorkflowVersion(): number {
      return this.workflowDefinition?.version || 0;
    }
  
    hasParent(): boolean {
      return this.parentWorkflowId !== '';
    }
  
    toShortString(): string {
      const name = this.workflowDefinition?.name;
      const version = this.workflowDefinition?.version;
      return `${name}.${version}/${this.workflowId}`;
    }
  
    getTaskByRefName(refName: string): TaskModel | null {
      if (refName == null) {
        throw new Error(
          "refName passed is null. Check the workflow execution. For dynamic tasks, make sure referenceTaskName is set to a not null value"
        );
      }
      const found: TaskModel[] = [];
      for (const task of this.tasks) {
        if (task.referenceTaskName == null) {
          throw new Error(
            `Task ${task.taskDefName}, seq=${task.seq} does not have reference name specified.`
          );
        }
        if (task.referenceTaskName === refName) {
          found.push(task);
        }
      }
      if (found.length === 0) {
        return null;
      }
      return found[found.length - 1];
    }
  
    externalizeInput(path: string): void {
      this.input = { ...this.inputPayload };
      this.inputPayload = {};
      this.externalInputPayloadStoragePath = path;
    }
  
    externalizeOutput(path: string): void {
      this.output = { ...this.outputPayload };
      this.outputPayload = {};
      this.externalOutputPayloadStoragePath = path;
    }
  
    internalizeInput(data: Record<string, any>): void {
      this.input = {};
      this.inputPayload = data;
    }
  
    internalizeOutput(data: Record<string, any>): void {
      this.output = {};
      this.outputPayload = data;
    }
  
    toWorkflow(): Workflow {
      const workflow: Workflow = {
        status: WorkflowStatus[this.status.name],
        endTime: this.endTime,
        workflowId: this.workflowId,
        parentWorkflowId: this.parentWorkflowId,
        parentWorkflowTaskId: this.parentWorkflowTaskId,
        tasks: this.tasks.map((task) => task.toTask()),
        input: this.externalInputPayloadStoragePath ? {} : this.input,
        output: this.externalOutputPayloadStoragePath ? {} : this.output,
        correlationId: this.correlationId,
        reRunFromWorkflowId: this.reRunFromWorkflowId,
        reasonForIncompletion: this.reasonForIncompletion,
        event: this.event,
        taskToDomain: this.taskToDomain,
        failedReferenceTaskNames: Array.from(this.failedReferenceTaskNames),
        failedTaskNames: Array.from(this.failedTaskNames),
        workflowDefinition: this.workflowDefinition,
        externalInputPayloadStoragePath: this.externalInputPayloadStoragePath,
        externalOutputPayloadStoragePath: this.externalOutputPayloadStoragePath,
        priority: this.priority,
        variables: this.variables,
        lastRetriedTime: this.lastRetriedTime,
        ownerApp: this.ownerApp,
        createTime: this.createTime,
        updatedTime: this.updatedTime,
        createdBy: this.createdBy,
        updatedBy: this.updatedBy,
        failedTaskId: this.failedTaskId,
      };
  
      return workflow;
    }
  
    addInput(key: string, value: any): void {
      this.input[key] = value;
    }
  
    addInputs(inputData: Record<string, any>): void {
      if (inputData != null) {
        this.input = { ...this.input, ...inputData };
      }
    }
  
    addOutput(key: string, value: any): void {
      this.output[key] = value;
    }
  
    addOutputs(outputData: Record<string, any>): void {
      if (outputData != null) {
        this.output = { ...this.output, ...outputData };
      }
    }
  }