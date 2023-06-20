import { TASK_TYPE_WAIT } from '../../../common/metadata/tasks/TaskType'
import { TaskType } from '../../../common/metadata/workflow/WorkflowDef'
import { logger } from '../../../common/utils/Logger'
import { WorkflowModel } from '../../model/WorkflowModel'
import TaskMapper from './TaskMapper'
import TaskMapperContext from './TaskMapperContext'

class WaitTaskMapper implements TaskMapper {
  private readonly parametersUtils: ParametersUtils

  constructor (parametersUtils: ParametersUtils) {
    this.parametersUtils = parametersUtils
  }

  public getTaskType (): string {
    return TaskType.WAIT
  }

  public getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    logger.debug(`TaskMapperContext ${taskMapperContext} in WaitTaskMapper`)

    const workflowModel: WorkflowModel = taskMapperContext.getWorkflowModel()
    const taskId: string = taskMapperContext.getTaskId()

    const waitTaskInput: Record<string, any> =
      this.parametersUtils.getTaskInputV2(
        taskMapperContext.getWorkflowTask().getInputParameters(),
        workflowModel,
        taskId,
        null
      )

    const waitTask: TaskModel = taskMapperContext.createTaskModel()
    waitTask.setTaskType(TASK_TYPE_WAIT)
    waitTask.setInputData(waitTaskInput)
    waitTask.setStartTime(Date.now())
    waitTask.setStatus(TaskModel.Status.IN_PROGRESS)

    return [waitTask]
  }
}

export default WaitTaskMapper
