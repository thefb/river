import { DynamicForkJoinTask } from './DynamicForkJoinTask'

export class DynamicForkJoinTaskList {
  dynamicTasks: DynamicForkJoinTask[] = []

  addWithParams (
    taskName: string,
    workflowName: string,
    referenceName: string,
    input: Record<string, any>
  ): void {
    this.dynamicTasks.push(
      new DynamicForkJoinTask(taskName, workflowName, referenceName, input)
    )
  }

  addWithTask (dtask: DynamicForkJoinTask): void {
    this.dynamicTasks.push(dtask)
  }
}
