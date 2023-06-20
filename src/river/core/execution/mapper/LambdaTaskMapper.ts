export class LambdaTaskMapper implements TaskMapper {
  private parametersUtils: ParametersUtils
  private metadataDAO: MetadataDAO

  constructor (parametersUtils: ParametersUtils, metadataDAO: MetadataDAO) {
    this.parametersUtils = parametersUtils
    this.metadataDAO = metadataDAO
  }

  getTaskType (): string {
    return TaskType.LAMBDA
  }

  getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    console.log(`TaskMapperContext ${taskMapperContext} in LambdaTaskMapper`)

    const workflowTask = taskMapperContext.getWorkflowTask()
    const workflowModel = taskMapperContext.getWorkflowModel()
    const taskId = taskMapperContext.getTaskId()

    const taskDefinition =
      taskMapperContext.getTaskDefinition() ||
      this.metadataDAO.getTaskDef(workflowTask.getName())

    const taskInput = this.parametersUtils.getTaskInputV2(
      workflowTask.getInputParameters(),
      workflowModel,
      taskId,
      taskDefinition
    )

    const lambdaTask: TaskModel = {
      taskType: TaskType.TASK_TYPE_LAMBDA,
      startTime: Date.now(),
      inputData: taskInput,
      status: TaskModel.Status.IN_PROGRESS
    }

    return [lambdaTask]
  }
}

export default LambdaTaskMapper
