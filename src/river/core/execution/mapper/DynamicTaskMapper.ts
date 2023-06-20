import { TaskDef } from '../../../common/metadata/tasks/TaskDef'
import { WorkflowTask } from '../../../common/metadata/workflow/WorkflowTask'
import { TerminateWorkflowException } from '../../exception/TerminateWorkflowException'
import { WorkflowModel } from '../../model/WorkflowModel'

export class DynamicTaskMapper implements TaskMapper {
  private static readonly LOGGER = getLogger(DynamicTaskMapper.name)

  private readonly parametersUtils: ParametersUtils
  private readonly metadataDAO: MetadataDAO

  constructor (parametersUtils: ParametersUtils, metadataDAO: MetadataDAO) {
    this.parametersUtils = parametersUtils
    this.metadataDAO = metadataDAO
  }

  getTaskType (): string {
    return 'DYNAMIC'
  }

  getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    DynamicTaskMapper.LOGGER.debug(
      'TaskMapperContext {} in DynamicTaskMapper',
      taskMapperContext
    )

    const workflowTask: WorkflowTask = taskMapperContext.getWorkflowTask()
    const taskInput: Record<string, unknown> = taskMapperContext.getTaskInput()
    const workflowModel: WorkflowModel = taskMapperContext.getWorkflowModel()
    const retryCount: number = taskMapperContext.getRetryCount()
    const retriedTaskId: string = taskMapperContext.getRetryTaskId()

    const taskNameParam: string = workflowTask.getDynamicTaskNameParam()
    const taskName: string = this.getDynamicTaskName(taskInput, taskNameParam)
    workflowTask.setName(taskName)
    const taskDefinition: TaskDef = this.getDynamicTaskDefinition(workflowTask)
    workflowTask.setTaskDefinition(taskDefinition)

    const input: Record<string, unknown> = this.parametersUtils.getTaskInput(
      workflowTask.getInputParameters(),
      workflowModel,
      taskDefinition,
      taskMapperContext.getTaskId()
    )

    const dynamicTask: TaskModel = taskMapperContext.createTaskModel()
    dynamicTask.setStartDelayInSeconds(workflowTask.getStartDelay())
    dynamicTask.setInputData(input)
    dynamicTask.setStatus('SCHEDULED')
    dynamicTask.setRetryCount(retryCount)
    dynamicTask.setCallbackAfterSeconds(workflowTask.getStartDelay())
    dynamicTask.setResponseTimeoutSeconds(
      taskDefinition.getResponseTimeoutSeconds()
    )
    dynamicTask.setTaskType(taskName)
    dynamicTask.setRetriedTaskId(retriedTaskId)
    dynamicTask.setWorkflowPriority(workflowModel.getPriority())

    return [dynamicTask]
  }

  private getDynamicTaskName (
    taskInput: Record<string, unknown>,
    taskNameParam: string
  ): string {
    const dynamicTaskName: string | undefined = String(taskInput[taskNameParam])
    if (dynamicTaskName) {
      return dynamicTaskName
    } else {
      const reason = `Cannot map a dynamic task based on the parameter and input. Parameter=${taskNameParam}, input=${taskInput}`
      throw new TerminateWorkflowException(reason)
    }
  }

  private getDynamicTaskDefinition (workflowTask: WorkflowTask): TaskDef {
    return (
      workflowTask.taskDefinition ||
      this.metadataDAO.getTaskDef(
        workflowTask.name ||
          (() => {
            const reason = `Invalid task specified. Cannot find task by name ${workflowTask.name} in the task definitions`
            throw new TerminateWorkflowException(reason)
          })()
      )
    )
  }
}
