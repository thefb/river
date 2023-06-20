class WorkflowCreationEvent implements Serializable {
  private readonly startWorkflowInput: StartWorkflowInput

  constructor (startWorkflowInput: StartWorkflowInput) {
    this.startWorkflowInput = startWorkflowInput
  }

  public getStartWorkflowInput (): StartWorkflowInput {
    return this.startWorkflowInput
  }
}

export = WorkflowCreationEvent
