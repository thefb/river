export class TerminateWorkflowException extends Error {
    private readonly workflowStatus: WorkflowModel.Status;
    private readonly task: TaskModel | null;
  
    constructor(reason: string);
    constructor(reason: string, workflowStatus: WorkflowModel.Status);
    constructor(reason: string, workflowStatus: WorkflowModel.Status, task: TaskModel | null);
    constructor(reason: string, workflowStatus?: WorkflowModel.Status, task?: TaskModel | null) {
      super(reason);
      this.name = 'TerminateWorkflowException';
      this.workflowStatus = workflowStatus || FAILED;
      this.task = task || null;
    }
  
    getWorkflowStatus(): WorkflowModel.Status {
      return this.workflowStatus;
    }
  
    getTask(): TaskModel | null {
      return this.task;
    }
  }
  