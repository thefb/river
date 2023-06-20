import { StartWorkflowRequest } from '../../common/metadata/workflow/StartWorkflowRequest'
import { WorkflowDef } from '../../common/metadata/workflow/WorkflowDef'
import { hash } from '../../utils'

interface MapLike<T> {
  [key: string]: T
}

export class StartWorkflowInput {
  private name: string
  private version: number | undefined
  private workflowDefinition: WorkflowDef | undefined
  private workflowInput: MapLike<unknown>;
  private externalInputPayloadStoragePath: string | undefined
  private correlationId: string | undefined
  private priority: number
  private parentWorkflowId: string
  private parentWorkflowTaskId: string
  private event: string
  private taskToDomain: MapLike<string>;
  private workflowId: string
  private triggeringWorkflowId: string

  constructor (startWorkflowRequest?: StartWorkflowRequest) {
    if (startWorkflowRequest) {
      this.name = startWorkflowRequest.name
      this.version = startWorkflowRequest.version
      this.workflowDefinition = startWorkflowRequest.workflowDef
      this.correlationId = startWorkflowRequest.correlationId
      this.priority = startWorkflowRequest.priority
      this.workflowInput = startWorkflowRequest.input;
      this.externalInputPayloadStoragePath =
        startWorkflowRequest.externalInputPayloadStoragePath
      this.taskToDomain = startWorkflowRequest.taskToDomain
    }
  }

  equals (o: unknown): boolean {
    if (this === o) return true
    if (!(o instanceof StartWorkflowInput)) return false
    const that: StartWorkflowInput = o
    return (
      this.name === that.name &&
      this.version === that.version &&
      this.workflowDefinition === that.workflowDefinition &&
      this.workflowInput === that.workflowInput &&
      this.externalInputPayloadStoragePath ===
        that.externalInputPayloadStoragePath &&
      this.correlationId === that.correlationId &&
      this.priority === that.priority &&
      this.parentWorkflowId === that.parentWorkflowId &&
      this.parentWorkflowTaskId === that.parentWorkflowTaskId &&
      this.event === that.event &&
      this.taskToDomain === that.taskToDomain &&
      this.triggeringWorkflowId === that.triggeringWorkflowId &&
      this.workflowId === that.workflowId
    )
  }

  hashCode (): number {
    return hash(
      this.name,
      this.version,
      this.workflowDefinition,
      this.workflowInput,
      this.externalInputPayloadStoragePath,
      this.correlationId,
      this.priority,
      this.parentWorkflowId,
      this.parentWorkflowTaskId,
      this.event,
      this.taskToDomain,
      this.triggeringWorkflowId,
      this.workflowId
    )
  }
}
