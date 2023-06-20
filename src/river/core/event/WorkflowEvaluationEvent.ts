import { WorkflowModel } from '../model/WorkflowModel'

class WorkflowEvaluationEvent implements Serializable {
  private readonly workflowModel: WorkflowModel

  constructor (workflowModel: WorkflowModel) {
    this.workflowModel = workflowModel
  }

  public getWorkflowModel (): WorkflowModel {
    return this.workflowModel
  }
}

export = WorkflowEvaluationEvent
F
