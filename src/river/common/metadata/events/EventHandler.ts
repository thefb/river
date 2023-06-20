export class EventHandler {
  name: string
  event: string
  condition?: string
  actions: EventHandlerAction[]
  active: boolean
  evaluatorType?: string

  constructor () {
    this.actions = []
  }
}

export class EventHandlerAction {
  action: string
  start_workflow?: StartWorkflow
  complete_task?: TaskDetails
  fail_task?: TaskDetails
  expandInlineJSON: boolean
}

export const ActionType = {
  start_workflow: 'start_workflow',
  complete_task: 'complete_task',
  fail_task: 'fail_task'
}

export class TaskDetails {
  workflowId: string
  taskRefName: string
  output: Record<string, any>
  outputMessage: any
  taskId: string
}

export class StartWorkflow {
  name: string
  version: number
  correlationId: string
  input: Record<string, any>
  inputMessage: any
  taskToDomain: Record<string, string>
}
