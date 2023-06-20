export class SystemTaskRegistry {
  private registry: Record<string, WorkflowSystemTask>

  constructor (tasks: Set<WorkflowSystemTask>) {
    this.registry = {}
    for (const task of tasks) {
      this.registry[task.getTaskType()] = task
    }
  }

  get (taskType: string): WorkflowSystemTask {
    const task = this.registry[taskType]
    if (!task) {
      throw new Error(`${taskType} not found in SystemTaskRegistry`)
    }
    return task
  }

  isSystemTask (taskType: string): boolean {
    return taskType in this.registry
  }
}
