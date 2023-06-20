export class SimpleTaskMapper implements TaskMapper {
  private readonly parametersUtils: ParametersUtils

  constructor (parametersUtils: ParametersUtils) {
    this.parametersUtils = parametersUtils
  }

  getTaskType (): string {
    return TaskType.SIMPLE
  }

  getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    console.log(`TaskMapperContext ${taskMapperContext} in SimpleTaskMapper`)

    const workflowTask = taskMapperContext.getWorkflowTask()
    const workflowModel = taskMapperContext.getWorkflowModel()
    const retryCount = taskMapperContext.getRetryCount()
    const retriedTaskId = taskMapperContext.getRetryTaskId()

    const taskDefinition = workflowTask.getTaskDefinition()
    if (!taskDefinition) {
      const reason = `Invalid task. Task ${workflowTask.getName()} does not have a definition`
      throw new TerminateWorkflowException(reason)
    }

    const input = this.parametersUtils.getTaskInput(
      workflowTask.getInputParameters(),
      workflowModel,
      taskDefinition,
      taskMapperContext.getTaskId()
    )

    const simpleTask: TaskModel = {
      taskType: workflowTask.getName(),
      startDelayInSeconds: workflowTask.getStartDelay(),
      inputData: input,
      status: TaskModel.Status.SCHEDULED,
      retryCount: retryCount,
      callbackAfterSeconds: workflowTask.getStartDelay(),
      responseTimeoutSeconds: taskDefinition.getResponseTimeoutSeconds(),
      retriedTaskId: retriedTaskId,
      rateLimitPerFrequency: taskDefinition.getRateLimitPerFrequency(),
      rateLimitFrequencyInSeconds:
        taskDefinition.getRateLimitFrequencyInSeconds()
    }

    return [simpleTask]
  }
}

export default SimpleTaskMapper
