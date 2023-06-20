import { WorkflowDef } from './WorkflowDef'

export class StartWorkflowRequest {
  name: string
  version?: number
  correlationId?: string
  input: Record<string, any> = {}
  taskToDomain: Record<string, string> = {}
  workflowDef?: WorkflowDef
  externalInputPayloadStoragePath?: string
  priority = 0

  withName (name: string): StartWorkflowRequest {
    this.name = name
    return this
  }

  withVersion (version: number): StartWorkflowRequest {
    this.version = version
    return this
  }
  withCorrelationId (correlationId: string): StartWorkflowRequest {
    this.correlationId = correlationId
    return this
  }

  withExternalInputPayloadStoragePath (
    externalInputPayloadStoragePath: string
  ): StartWorkflowRequest {
    this.externalInputPayloadStoragePath = externalInputPayloadStoragePath
    return this
  }

  withPriority (priority: number): StartWorkflowRequest {
    this.priority = priority
    return this
  }

  withInput (input: Record<string, any>): StartWorkflowRequest {
    this.input = input
    return this
  }

  withTaskToDomain (taskToDomain: Record<string, string>): StartWorkflowRequest {
    this.taskToDomain = taskToDomain
    return this
  }

  withWorkflowDef (workflowDef: WorkflowDef): StartWorkflowRequest {
    this.workflowDef = workflowDef
    return this
  }
}
