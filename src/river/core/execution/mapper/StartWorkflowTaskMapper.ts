class StartWorkflowTaskMapper implements TaskMapper {
  getTaskType (): string {
    return TaskType.START_WORKFLOW
  }

  getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    const workflowTask = taskMapperContext.getWorkflowTask()

    const startWorkflowTask: TaskModel = {
      taskType: TASK_TYPE_START_WORKFLOW,
      inputData: taskMapperContext.getTaskInput(),
      status: TaskModel.Status.SCHEDULED,
      callbackAfterSeconds: workflowTask.getStartDelay()
    }

    console.log(`${startWorkflowTask} created`)
    return [startWorkflowTask]
  }
}

export default StartWorkflowTaskMapper
