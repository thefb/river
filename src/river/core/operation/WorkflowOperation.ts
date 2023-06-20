export interface WorkflowOperation<T, R> {
  execute(input: T): R
}
