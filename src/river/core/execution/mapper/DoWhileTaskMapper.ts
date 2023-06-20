export class DoWhileTaskMapper implements TaskMapper {
  private static readonly LOGGER = getLogger(DoWhileTaskMapper.name)

  private readonly metadataDAO: MetadataDAO
  private readonly parametersUtils: ParametersUtils

  constructor (metadataDAO: MetadataDAO, parametersUtils: ParametersUtils) {
    this.metadataDAO = metadataDAO
    this.parametersUtils = parametersUtils
  }

  getTaskType (): string {
    return 'DO_WHILE'
  }

  getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    DoWhileTaskMapper.LOGGER.debug(
      'TaskMapperContext {} in DoWhileTaskMapper',
      taskMapperContext
    )

    const workflowTask: WorkflowTask = taskMapperContext.getWorkflowTask()
    const workflowModel: WorkflowModel = taskMapperContext.getWorkflowModel()

    const task: TaskModel | undefined = workflowModel.getTaskByRefName(
      workflowTask.getTaskReferenceName()
    )
    if (task && task.getStatus() === 'COMPLETED') {
      return []
    }

    const taskDefinition: TaskDef =
      taskMapperContext.getTaskDefinition() ||
      this.metadataDAO.getTaskDef(workflowTask.getName()) ||
      new TaskDef()

    const doWhileTask: TaskModel = taskMapperContext.createTaskModel()
    doWhileTask.setTaskType('TASK_TYPE_DO_WHILE')
    doWhileTask.setStatus('IN_PROGRESS')
    doWhileTask.setStartTime(Date.now())
    doWhileTask.setRateLimitPerFrequency(
      taskDefinition.getRateLimitPerFrequency()
    )
    doWhileTask.setRateLimitFrequencyInSeconds(
      taskDefinition.getRateLimitFrequencyInSeconds()
    )
    doWhileTask.setRetryCount(taskMapperContext.getRetryCount())

    const taskInput: Record<string, unknown> =
      this.parametersUtils.getTaskInputV2(
        workflowTask.getInputParameters(),
        workflowModel,
        doWhileTask.getTaskId(),
        taskDefinition
      )
    doWhileTask.setInputData(taskInput)

    return [doWhileTask]
  }
}
