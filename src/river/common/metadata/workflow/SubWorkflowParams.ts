import { WorkflowDef } from './WorkflowDef'
import { isEqual } from 'lodash'

export class SubWorkflowParams {
  public name: string
  public version: number
  public taskToDomain: Map<string, string>
  public workflowDefinition: WorkflowDef | object

  public getName (): string {
    return this.name
  }

  public getVersion (): number {
    return this.version
  }

  public getTaskToDomain (): Map<string, string> {
    return this.taskToDomain
  }

  public getWorkflowDefinition (): WorkflowDef | object {
    return this.workflowDefinition
  }

  public getWorkflowDef (): WorkflowDef {
    return this.workflowDefinition as WorkflowDef
  }

  public setWorkflowDefinition (workflowDef: WorkflowDef | object): void {
    if (!(workflowDef == null || workflowDef instanceof WorkflowDef)) {
      throw new Error('workflowDefinition must be either null or WorkflowDef')
    }
    this.workflowDefinition = workflowDef
  }

  public setWorkflowDef (workflowDef: WorkflowDef): void {
    this.workflowDefinition = workflowDef
  }

  public equals (o: object): boolean {
    if (this === o) {
      return true
    }
    if (o == null || this.constructor !== o.constructor) {
      return false
    }
    const that: SubWorkflowParams = o as SubWorkflowParams
    return (
      this.name === that.name &&
      this.version === that.version &&
      isEqual(this.taskToDomain, that.taskToDomain) &&
      isEqual(this.workflowDefinition, that.workflowDefinition)
    )
  }
}
