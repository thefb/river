import { TASK_TYPE_TERMINATE } from '../../../common/metadata/tasks/TaskType'
import { TaskType } from '../../../common/metadata/workflow/WorkflowDef'
import { logger } from '../../../common/utils/Logger'
import { WorkflowModel } from '../../model/WorkflowModel'
import TaskMapper from './TaskMapper'
import TaskMapperContext from './TaskMapperContext'

class TerminateTaskMapper implements TaskMapper {
  private readonly parametersUtils: ParametersUtils

  constructor (parametersUtils: ParametersUtils) {
    this.parametersUtils = parametersUtils
  }

  public getTaskType (): string {
    return TaskType.TERMINATE
  }

  public getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    logger.debug(
      `TaskMapperContext ${taskMapperContext} in TerminateTaskMapper`
    )

    const workflowModel: WorkflowModel = taskMapperContext.getWorkflowModel()
    const taskId: string = taskMapperContext.getTaskId()

    const taskInput: Record<string, any> = this.parametersUtils.getTaskInputV2(
      taskMapperContext.getWorkflowTask().getInputParameters(),
      workflowModel,
      taskId,
      null
    )

    const task: TaskModel = taskMapperContext.createTaskModel()
    task.setTaskType(TASK_TYPE_TERMINATE)
    task.setStartTime(Date.now())
    task.setInputData(taskInput)
    task.setStatus(TaskModel.Status.IN_PROGRESS)
    return [task]
  }
}

export default TerminateTaskMapper
