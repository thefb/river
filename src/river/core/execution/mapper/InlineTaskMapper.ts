import { TaskDef } from '../../../common/metadata/tasks/TaskDef'
import { WorkflowTask } from '../../../common/metadata/workflow/WorkflowTask'

export class InlineTaskMapper implements TaskMapper {
  private parametersUtils: ParametersUtils
  private metadataDAO: MetadataDAO

  constructor (parametersUtils: ParametersUtils, metadataDAO: MetadataDAO) {
    this.parametersUtils = parametersUtils
    this.metadataDAO = metadataDAO
  }

  getTaskType (): string {
    return 'INLINE'
  }

  getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    const workflowTask: WorkflowTask = taskMapperContext.workflowTask
    const workflowModel: WorkflowModel = taskMapperContext.workflowModel
    const taskId: string = taskMapperContext.taskId

    const taskDefinition: TaskDef =
      taskMapperContext.taskDefinition ||
      this.metadataDAO.getTaskDef(workflowTask.name)

    const taskInput: Record<string, any> = this.parametersUtils.getTaskInputV2(
      workflowTask.inputParameters,
      workflowModel,
      taskId,
      taskDefinition
    )

    const inlineTask: TaskModel = taskMapperContext.createTaskModel()
    inlineTask.taskType = 'TASK_TYPE_INLINE'
    inlineTask.startTime = Date.now()
    inlineTask.inputData = taskInput
    inlineTask.status = 'IN_PROGRESS'

    return [inlineTask]
  }
}
