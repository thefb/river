import { hash } from '../../../utils'
import { TaskType } from '../tasks/TaskType'
import { SubWorkflowParams } from './SubWorkflowParams'
import { TaskDef } from '../tasks/TaskDef'

export class WorkflowTask {
  name: string
  taskReferenceName: string
  description?: string
  inputParameters: Record<string, any> = {}
  type: TaskType = TaskType.SIMPLE
  dynamicTaskNameParam?: string
  caseValueParam?: string
  caseExpression?: string
  scriptExpression?: string
  decisionCases: Record<string, WorkflowTask[]> = {}
  dynamicForkJoinTasksParam?: string
  dynamicForkTasksParam?: string
  dynamicForkTasksInputParamName?: string
  defaultCase: WorkflowTask[] = []
  forkTasks: WorkflowTask[][] = []
  startDelay = 0
  subWorkflowParam?: SubWorkflowParams
  joinOn: string[] = []
  sink?: string
  optional = false
  taskDefinition?: TaskDef
  rateLimited?: boolean
  defaultExclusiveJoinTask: string[] = []
  asyncComplete = false
  loopCondition?: string
  loopOver: WorkflowTask[] = []
  retryCount?: number
  evaluatorType?: string
  expression?: string

  // Implement additional methods here
  private children (): Array<Array<WorkflowTask>> {
    const workflowTaskLists: Array<Array<WorkflowTask>> = []

    switch (this.type) {
      case TaskType.DECISION:
      case TaskType.SWITCH:
        workflowTaskLists.push(...Object.values(this.decisionCases))
        workflowTaskLists.push(this.defaultCase)
        break
      case TaskType.FORK_JOIN:
        workflowTaskLists.push(...this.forkTasks)
        break
      case TaskType.DO_WHILE:
        workflowTaskLists.push(this.loopOver)
        break
      default:
        break
    }

    return workflowTaskLists
  }

  collectTasks (): WorkflowTask[] {
    const tasks: WorkflowTask[] = [this]
    for (const workflowTaskList of this.children()) {
      for (const workflowTask of workflowTaskList) {
        tasks.push(...workflowTask.collectTasks())
      }
    }
    return tasks
  }

  next (
    taskReferenceName: string,
    parent: WorkflowTask | null
  ): WorkflowTask | null {
    const taskType = this.type

    switch (taskType) {
      case TaskType.DO_WHILE:
      case TaskType.DECISION:
      case TaskType.SWITCH: {
        for (const workflowTasks of this.children()) {
          for (const task of workflowTasks) {
            if (task.taskReferenceName === taskReferenceName) {
              return task
            }
            const nextTask = task.next(taskReferenceName, this)
            if (nextTask) {
              return nextTask
            }
            if (task.has(taskReferenceName)) {
              break
            }
          }
        }
        if (taskType === TaskType.DO_WHILE && this.has(taskReferenceName)) {
          return this
        }
        break
      }
      case TaskType.FORK_JOIN: {
        let found = false
        for (const workflowTasks of this.children()) {
          for (const task of workflowTasks) {
            if (task.taskReferenceName === taskReferenceName) {
              found = true
              break
            }
            const nextTask = task.next(taskReferenceName, this)
            if (nextTask) {
              return nextTask
            }
            if (task.has(taskReferenceName)) {
              break
            }
          }
          if (found && parent !== null) {
            return parent.next(this.taskReferenceName, parent)
          }
        }
        break
      }
      case TaskType.DYNAMIC:
      case TaskType.TERMINATE:
      case TaskType.SIMPLE:
        return null
      default:
        break
    }
    return null
  }

  has (taskReferenceName: string): boolean {
    if (this.taskReferenceName === taskReferenceName) {
      return true
    }

    switch (this.type) {
      case TaskType.DECISION:
      case TaskType.SWITCH:
      case TaskType.DO_WHILE:
      case TaskType.FORK_JOIN:
        for (const childx of this.children()) {
          for (const child of childx) {
            if (child.has(taskReferenceName)) {
              return true
            }
          }
        }
        break
      default:
        break
    }
    return false
  }

  get (taskReferenceName: string): WorkflowTask | null {
    if (this.taskReferenceName === taskReferenceName) {
      return this
    }
    for (const childx of this.children()) {
      for (const child of childx) {
        const found = child.get(taskReferenceName)
        if (found !== null) {
          return found
        }
      }
    }
    return null
  }

  toString (): string {
    return `${this.name}/${this.taskReferenceName}`
  }

  equals (other: any): boolean {
    if (this === other) {
      return true
    }

    if (!(other instanceof WorkflowTask)) {
      return false
    }

    const that = other as WorkflowTask

    return (
      this.startDelay === that.startDelay &&
      this.optional === that.optional &&
      this.name === that.name &&
      this.taskReferenceName === that.taskReferenceName &&
      this.description === that.description &&
      this.inputParametersAreEqual(
        this.inputParameters,
        that.inputParameters
      ) &&
      this.type === that.type &&
      this.dynamicTaskNameParam === that.dynamicTaskNameParam &&
      this.caseValueParam === that.caseValueParam &&
      this.evaluatorType === that.evaluatorType &&
      this.expression === that.expression &&
      this.caseExpression === that.caseExpression &&
      this.decisionCasesAreEqual(this.decisionCases, that.decisionCases) &&
      this.dynamicForkJoinTasksParam === that.dynamicForkJoinTasksParam &&
      this.dynamicForkTasksParam === that.dynamicForkTasksParam &&
      this.dynamicForkTasksInputParamName ===
        that.dynamicForkTasksInputParamName &&
      this.defaultCaseIsEqual(this.defaultCase, that.defaultCase) &&
      this.forkTasksAreEqual(this.forkTasks, that.forkTasks) &&
      this.subWorkflowParamIsEqual(
        this.subWorkflowParam,
        that.subWorkflowParam
      ) &&
      this.joinOnIsEqual(this.joinOn, that.joinOn) &&
      this.sink === that.sink &&
      this.asyncComplete === that.asyncComplete &&
      this.defaultExclusiveJoinTaskIsEqual(
        this.defaultExclusiveJoinTask,
        that.defaultExclusiveJoinTask
      ) &&
      this.retryCount === that.retryCount
    )
  }

  hashCode (): number {
    return hash(
      this.name,
      this.taskReferenceName,
      this.description,
      this.inputParameters,
      this.type,
      this.dynamicTaskNameParam,
      this.caseValueParam,
      this.caseExpression,
      this.evaluatorType,
      this.expression,
      this.decisionCases,
      this.dynamicForkJoinTasksParam,
      this.dynamicForkTasksParam,
      this.dynamicForkTasksInputParamName,
      this.defaultCase,
      this.forkTasks,
      this.startDelay,
      this.subWorkflowParam,
      this.joinOn,
      this.sink,
      this.asyncComplete,
      this.optional,
      this.defaultExclusiveJoinTask,
      this.retryCount
    )
  }

  private inputParametersAreEqual (
    a: Record<string, any>,
    b: Record<string, any>
  ): boolean {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)

    if (keysA.length !== keysB.length) {
      return false
    }

    for (const key of keysA) {
      if (a[key] !== b[key]) {
        return false
      }
    }

    return true
  }

  private decisionCasesAreEqual (
    a: Record<string, WorkflowTask[]>,
    b: Record<string, WorkflowTask[]>
  ): boolean {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)

    if (keysA.length !== keysB.length) {
      return false
    }

    for (const key of keysA) {
      if (
        !Object.prototype.hasOwnProperty.call(b, key) ||
        !this.tasksAreEqual(a[key], b[key])
      ) {
        return false
      }
    }

    return true
  }

  private tasksAreEqual (a: WorkflowTask[], b: WorkflowTask[]): boolean {
    if (a.length !== b.length) {
      return false
    }

    for (let i = 0; i < a.length; i++) {
      if (!a[i].equals(b[i])) {
        return false
      }
    }

    return true
  }

  private childrenAreEqual (a: WorkflowTask[], b: WorkflowTask[]): boolean {
    if (a.length !== b.length) {
      return false
    }

    for (let i = 0; i < a.length; i++) {
      if (!a[i].equals(b[i])) {
        return false
      }
    }

    return true
  }

  private defaultCaseIsEqual (a: WorkflowTask[], b: WorkflowTask[]): boolean {
    return this.tasksAreEqual(a, b)
  }

  private forkTasksAreEqual (a: WorkflowTask[][], b: WorkflowTask[][]): boolean {
    if (a.length !== b.length) {
      return false
    }

    for (let i = 0; i < a.length; i++) {
      if (!this.childrenAreEqual(a[i], b[i])) {
        return false
      }
    }

    return true
  }

  private subWorkflowParamIsEqual (
    a: SubWorkflowParams | undefined,
    b: SubWorkflowParams | undefined
  ): boolean {
    if (!a && !b) {
      return true
    }

    if (!a || !b) {
      return false
    }

    return (
      a.name === b.name &&
      a.version === b.version &&
      this.inputParametersAreEqual(a.taskToDomain, b.taskToDomain) &&
      this.inputParametersAreEqual(a.workflowDefinition, b.workflowDefinition)
    )
  }

  private joinOnIsEqual (a: string[], b: string[]): boolean {
    if (a.length !== b.length) {
      return false
    }

    const sortedA = a.slice().sort()
    const sortedB = b.slice().sort()

    for (let i = 0; i < sortedA.length; i++) {
      if (sortedA[i] !== sortedB[i]) {
        return false
      }
    }

    return true
  }

  private defaultExclusiveJoinTaskIsEqual (a: string[], b: string[]): boolean {
    return this.joinOnIsEqual(a, b)
  }
}
