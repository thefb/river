import { TaskDef } from '../../../common/metadata/tasks/TaskDef'
import { TaskType } from '../../../common/metadata/workflow/WorkflowDef'
import { WorkflowTask } from '../../../common/metadata/workflow/WorkflowTask'
import { logger } from '../../../common/utils/Logger'
import { TerminateWorkflowException } from '../../exception/TerminateWorkflowException'
import { WorkflowModel } from '../../model/WorkflowModel'
import TaskMapper from './TaskMapper'
import TaskMapperContext from './TaskMapperContext'

class UserDefinedTaskMapper implements TaskMapper {
  private readonly parametersUtils: ParametersUtils
  private readonly metadataDAO: MetadataDAO

  constructor (parametersUtils: ParametersUtils, metadataDAO: MetadataDAO) {
    this.parametersUtils = parametersUtils
    this.metadataDAO = metadataDAO
  }

  public getTaskType (): string {
    return TaskType.USER_DEFINED
  }

  public getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    logger.debug(
      `TaskMapperContext ${taskMapperContext} in UserDefinedTaskMapper`
    )

    const workflowTask: WorkflowTask = taskMapperContext.getWorkflowTask()
    const workflowModel: WorkflowModel = taskMapperContext.getWorkflowModel()
    const taskId: string = taskMapperContext.getTaskId()
    const retryCount: number = taskMapperContext.getRetryCount()

    const taskDefinition: TaskDef =
      taskMapperContext.getTaskDefinition() ||
      this.metadataDAO.getTaskDef(workflowTask.getName())
    if (!taskDefinition) {
      const reason: string = `Invalid task specified. Cannot find task by name ${workflowTask.getName()} in the task definitions`
      throw new TerminateWorkflowException(reason)
    }

    const input: Record<string, any> = this.parametersUtils.getTaskInputV2(
      workflowTask.getInputParameters(),
      workflowModel,
      taskId,
      taskDefinition
    )

    const userDefinedTask: TaskModel = taskMapperContext.createTaskModel()
    userDefinedTask.setInputData(input)
    userDefinedTask.setStatus(TaskModel.Status.SCHEDULED)
    userDefinedTask.setRetryCount(retryCount)
    userDefinedTask.setCallbackAfterSeconds(workflowTask.getStartDelay())
    userDefinedTask.setRateLimitPerFrequency(
      taskDefinition.getRateLimitPerFrequency()
    )
    userDefinedTask.setRateLimitFrequencyInSeconds(
      taskDefinition.getRateLimitFrequencyInSeconds()
    )

    return [userDefinedTask]
  }
}

export default UserDefinedTaskMapper
