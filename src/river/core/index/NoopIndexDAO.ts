export class NoopIndexDAO implements IndexDAO {
  setup (): void {}

  indexWorkflow (workflowSummary: WorkflowSummary): void {}

  async asyncIndexWorkflow (workflowSummary: WorkflowSummary): Promise<void> {
    return Promise.resolve()
  }

  indexTask (taskSummary: TaskSummary): void {}

  async asyncIndexTask (taskSummary: TaskSummary): Promise<void> {
    return Promise.resolve()
  }

  searchWorkflows (
    query: string,
    freeText: string,
    start: number,
    count: number,
    sort: string[]
  ): SearchResult<string> {
    return new SearchResult<string>(0, [])
  }

  searchWorkflowSummary (
    query: string,
    freeText: string,
    start: number,
    count: number,
    sort: string[]
  ): SearchResult<WorkflowSummary> {
    return new SearchResult<WorkflowSummary>(0, [])
  }

  searchTasks (
    query: string,
    freeText: string,
    start: number,
    count: number,
    sort: string[]
  ): SearchResult<string> {
    return new SearchResult<string>(0, [])
  }

  searchTaskSummary (
    query: string,
    freeText: string,
    start: number,
    count: number,
    sort: string[]
  ): SearchResult<TaskSummary> {
    return new SearchResult<TaskSummary>(0, [])
  }

  removeWorkflow (workflowId: string): void {}

  async asyncRemoveWorkflow (workflowId: string): Promise<void> {
    return Promise.resolve()
  }

  updateWorkflow (
    workflowInstanceId: string,
    keys: string[],
    values: any[]
  ): void {}

  async asyncUpdateWorkflow (
    workflowInstanceId: string,
    keys: string[],
    values: any[]
  ): Promise<void> {
    return Promise.resolve()
  }

  removeTask (workflowId: string, taskId: string): void {}

  async asyncRemoveTask (workflowId: string, taskId: string): Promise<void> {
    return Promise.resolve()
  }

  updateTask (
    workflowId: string,
    taskId: string,
    keys: string[],
    values: any[]
  ): void {}

  async asyncUpdateTask (
    workflowId: string,
    taskId: string,
    keys: string[],
    values: any[]
  ): Promise<void> {
    return Promise.resolve()
  }

  get (workflowInstanceId: string, key: string): string {
    return null
  }

  addTaskExecutionLogs (logs: TaskExecLog[]): void {}

  async asyncAddTaskExecutionLogs (logs: TaskExecLog[]): Promise<void> {
    return Promise.resolve()
  }

  getTaskExecutionLogs (taskId: string): TaskExecLog[] {
    return []
  }

  addEventExecution (eventExecution: EventExecution): void {}

  getEventExecutions (event: string): EventExecution[] {
    return []
  }

  async asyncAddEventExecution (eventExecution: EventExecution): Promise<void> {
    return Promise.resolve()
  }

  addMessage (queue: string, msg: Message): void {}

  async asyncAddMessage (queue: string, message: Message): Promise<void> {
    return Promise.resolve()
  }

  getMessages (queue: string): Message[] {
    return []
  }

  searchArchivableWorkflows (
    indexName: string,
    archiveTtlDays: number
  ): string[] {
    return []
  }

  getWorkflowCount (query: string, freeText: string): number {
    return 0
  }
}
