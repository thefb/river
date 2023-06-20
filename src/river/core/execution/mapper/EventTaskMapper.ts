import { WorkflowTask } from "../../../common/metadata/workflow/WorkflowTask"
import { WorkflowModel } from "../../model/WorkflowModel"

export class EventTaskMapper implements TaskMapper {
  private static readonly LOGGER = getLogger(EventTaskMapper.name)

  private readonly parametersUtils: ParametersUtils

  constructor (parametersUtils: ParametersUtils) {
    this.parametersUtils = parametersUtils
  }

  getTaskType (): string {
    return 'EVENT'
  }

  getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    EventTaskMapper.LOGGER.debug(
      'TaskMapperContext {} in EventTaskMapper',
      taskMapperContext
    )

    const workflowTask: WorkflowTask = taskMapperContext.getWorkflowTask()
    const workflowModel: WorkflowModel = taskMapperContext.getWorkflowModel()
    const taskId: string = taskMapperContext.getTaskId()

    workflowTask.getInputParameters().set('sink', workflowTask.getSink())
    workflowTask
      .getInputParameters()
      .set('asyncComplete', workflowTask.isAsyncComplete())
    const eventTaskInput: Record<string, unknown> =
      this.parametersUtils.getTaskInputV2(
        workflowTask.getInputParameters(),
        workflowModel,
        taskId,
        null
      )
    const sink: string = eventTaskInput['sink'] as string
    const asyncComplete: boolean = eventTaskInput['asyncComplete'] as boolean

    const eventTask: TaskModel = taskMapperContext.createTaskModel()
    eventTask.setTaskType('EVENT')
    eventTask.setStatus('SCHEDULED')
    eventTask.setInputData(eventTaskInput)
    eventTask.getInputData().set('sink', sink)
    eventTask.getInputData().set('asyncComplete', asyncComplete)

    return [eventTask]
  }
}
