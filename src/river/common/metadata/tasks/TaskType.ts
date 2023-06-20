export enum TaskType {
  SIMPLE,
  DYNAMIC,
  FORK_JOIN,
  FORK_JOIN_DYNAMIC,
  DECISION,
  SWITCH,
  JOIN,
  DO_WHILE,
  SUB_WORKFLOW,
  START_WORKFLOW,
  EVENT,
  WAIT,
  HUMAN,
  USER_DEFINED,
  HTTP,
  LAMBDA,
  INLINE,
  EXCLUSIVE_JOIN,
  TERMINATE,
  KAFKA_PUBLISH,
  JSON_JQ_TRANSFORM,
  SET_VARIABLE
}

export const TASK_TYPE_DECISION = 'DECISION'
export const TASK_TYPE_SWITCH = 'SWITCH'
export const TASK_TYPE_DYNAMIC = 'DYNAMIC'
export const TASK_TYPE_JOIN = 'JOIN'
export const TASK_TYPE_DO_WHILE = 'DO_WHILE'
export const TASK_TYPE_FORK_JOIN_DYNAMIC = 'FORK_JOIN_DYNAMIC'
export const TASK_TYPE_EVENT = 'EVENT'
export const TASK_TYPE_WAIT = 'WAIT'
export const TASK_TYPE_HUMAN = 'HUMAN'
export const TASK_TYPE_SUB_WORKFLOW = 'SUB_WORKFLOW'
export const TASK_TYPE_START_WORKFLOW = 'START_WORKFLOW'
export const TASK_TYPE_FORK_JOIN = 'FORK_JOIN'
export const TASK_TYPE_SIMPLE = 'SIMPLE'
export const TASK_TYPE_HTTP = 'HTTP'
export const TASK_TYPE_LAMBDA = 'LAMBDA'
export const TASK_TYPE_INLINE = 'INLINE'
export const TASK_TYPE_EXCLUSIVE_JOIN = 'EXCLUSIVE_JOIN'
export const TASK_TYPE_TERMINATE = 'TERMINATE'
export const TASK_TYPE_KAFKA_PUBLISH = 'KAFKA_PUBLISH'
export const TASK_TYPE_JSON_JQ_TRANSFORM = 'JSON_JQ_TRANSFORM'
export const TASK_TYPE_SET_VARIABLE = 'SET_VARIABLE'
export const TASK_TYPE_FORK = 'FORK'

const BUILT_IN_TASKS = new Set<string>([
  TASK_TYPE_DECISION,
  TASK_TYPE_SWITCH,
  TASK_TYPE_FORK,
  TASK_TYPE_JOIN,
  TASK_TYPE_EXCLUSIVE_JOIN,
  TASK_TYPE_DO_WHILE
])

export function of (taskType: string): TaskType {
  try {
    return TaskType[taskType as keyof typeof TaskType]
  } catch (error) {
    return TaskType.USER_DEFINED
  }
}

export function isBuiltIn (taskType: string): boolean {
  return BUILT_IN_TASKS.has(taskType)
}
