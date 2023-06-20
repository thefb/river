export class SetVariableTaskMapper implements TaskMapper {
  getTaskType (): string {
    return TaskType.SET_VARIABLE
  }

  getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    console.log(`TaskMapperContext ${taskMapperContext} in SetVariableMapper`)

    const varTask: TaskModel = {
      startTime: Date.now(),
      inputData: taskMapperContext.getTaskInput(),
      status: TaskModel.Status.IN_PROGRESS
    }

    return [varTask]
  }
}

export default SetVariableTaskMapper
