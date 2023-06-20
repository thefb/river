export interface TaskStatusListener {
    onTaskScheduled(task: TaskModel): void;
  
    onTaskInProgress(task: TaskModel): void;
  
    onTaskCanceled(task: TaskModel): void;
  
    onTaskFailed(task: TaskModel): void;
  
    onTaskFailedWithTerminalError(task: TaskModel): void;
  
    onTaskCompleted(task: TaskModel): void;
  
    onTaskCompletedWithErrors(task: TaskModel): void;
  
    onTaskTimedOut(task: TaskModel): void;
  
    onTaskSkipped(task: TaskModel): void;
  }