export class KafkaPublishTaskMapper implements TaskMapper {
  private parametersUtils: ParametersUtils;
  private metadataDAO: MetadataDAO;

  constructor(parametersUtils: ParametersUtils, metadataDAO: MetadataDAO) {
    this.parametersUtils = parametersUtils;
    this.metadataDAO = metadataDAO;
  }

  getTaskType(): string {
    return TaskType.KAFKA_PUBLISH;
  }

  getMappedTasks(taskMapperContext: TaskMapperContext): TaskModel[] {
    console.log(`TaskMapperContext ${taskMapperContext} in KafkaPublishTaskMapper`);

    const workflowTask = taskMapperContext.getWorkflowTask();
    const workflowModel = taskMapperContext.getWorkflowModel();
    const taskId = taskMapperContext.getTaskId();
    const retryCount = taskMapperContext.getRetryCount();

    const taskDefinition =
      taskMapperContext.getTaskDefinition() || this.metadataDAO.getTaskDef(workflowTask.getName());

    const input = this.parametersUtils.getTaskInputV2(
      workflowTask.getInputParameters(),
      workflowModel,
      taskId,
      taskDefinition
    );

    const kafkaPublishTask: TaskModel = {
      inputData: input,
      status: TaskModel.Status.SCHEDULED,
      retryCount,
      callbackAfterSeconds: workflowTask.getStartDelay(),
    };

    if (taskDefinition) {
      kafkaPublishTask.executionNameSpace = taskDefinition.getExecutionNameSpace();
      kafkaPublishTask.isolationGroupId = taskDefinition.getIsolationGroupId();
      kafkaPublishTask.rateLimitPerFrequency = taskDefinition.getRateLimitPerFrequency();
      kafkaPublishTask.rateLimitFrequencyInSeconds = taskDefinition.getRateLimitFrequencyInSeconds();
    }

    return [kafkaPublishTask];
  }
}

export default KafkaPublishTaskMapper;
