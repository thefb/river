export class TaskStatusListenerStub implements TaskStatusListener {
  onTaskScheduled (task: TaskModel): void {
    console.debug(`Task ${task.taskId} is scheduled`)
  }

  onTaskCanceled (task: TaskModel): void {
    console.debug(`Task ${task.taskId} is canceled`)
  }

  onTaskCompleted (task: TaskModel): void {
    console.debug(`Task ${task.taskId} is completed`)
  }

  onTaskCompletedWithErrors (task: TaskModel): void {
    console.debug(`Task ${task.taskId} is completed with errors`)
  }

  onTaskFailed (task: TaskModel): void {
    console.debug(`Task ${task.taskId} is failed`)
  }

  onTaskFailedWithTerminalError (task: TaskModel): void {
    console.debug(`Task ${task.taskId} is failed with terminal error`)
  }

  onTaskInProgress (task: TaskModel): void {
    console.debug(`Task ${task.taskId} is in-progress`)
  }

  onTaskSkipped (task: TaskModel): void {
    console.debug(`Task ${task.taskId} is skipped`)
  }

  onTaskTimedOut (task: TaskModel): void {
    console.debug(`Task ${task.taskId} is timed out`)
  }
}
