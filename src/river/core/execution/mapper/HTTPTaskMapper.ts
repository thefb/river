import { TaskDef } from "../../../common/metadata/tasks/TaskDef"
import { WorkflowTask } from "../../../common/metadata/workflow/WorkflowTask"
import { WorkflowModel } from "../../model/WorkflowModel"

export class HTTPTaskMapper implements TaskMapper {
  private parametersUtils: ParametersUtils
  private metadataDAO: MetadataDAO

  constructor (parametersUtils: ParametersUtils, metadataDAO: MetadataDAO) {
    this.parametersUtils = parametersUtils
    this.metadataDAO = metadataDAO
  }

  getTaskType (): string {
    return 'HTTP'
  }

  getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    console.debug(`TaskMapperContext ${taskMapperContext} in HTTPTaskMapper`)

    const workflowTask: WorkflowTask = taskMapperContext.workflowTask
    workflowTask.inputParameters.asyncComplete = workflowTask.asyncComplete
    const workflowModel: WorkflowModel = taskMapperContext.workflowModel
    const taskId: string = taskMapperContext.taskId
    const retryCount: number = taskMapperContext.retryCount

    const taskDefinition: TaskDef =
      taskMapperContext.taskDefinition ??
      this.metadataDAO.getTaskDef(workflowTask.name)

    const input: Record<string, any> = this.parametersUtils.getTaskInputV2(
      workflowTask.inputParameters,
      workflowModel,
      taskId,
      taskDefinition
    )
    const asynComplete: boolean = input.asyncComplete

    const httpTask: TaskModel = taskMapperContext.createTaskModel()
    httpTask.inputData = input
    httpTask.inputData.asyncComplete = asynComplete
    httpTask.status = 'SCHEDULED'
    httpTask.retryCount = retryCount
    httpTask.callbackAfterSeconds = workflowTask.startDelay

    if (taskDefinition) {
      httpTask.rateLimitPerFrequency = taskDefinition.rateLimitPerFrequency
      httpTask.rateLimitFrequencyInSeconds =
        taskDefinition.rateLimitFrequencyInSeconds
      httpTask.isolationGroupId = taskDefinition.isolationGroupId
      httpTask.executionNameSpace = taskDefinition.executionNameSpace
    }

    return [httpTask]
  }
}
