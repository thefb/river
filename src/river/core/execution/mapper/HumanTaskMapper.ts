import { WorkflowModel } from "../../model/WorkflowModel"

export class HumanTaskMapper implements TaskMapper {
  private parametersUtils: ParametersUtils

  constructor (parametersUtils: ParametersUtils) {
    this.parametersUtils = parametersUtils
  }

  getTaskType (): string {
    return 'HUMAN'
  }

  getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    const workflowModel: WorkflowModel = taskMapperContext.workflowModel
    const taskId: string = taskMapperContext.taskId

    const humanTaskInput: Record<string, any> =
      this.parametersUtils.getTaskInputV2(
        taskMapperContext.workflowTask.inputParameters,
        workflowModel,
        taskId,
        null
      )

    const humanTask: TaskModel = taskMapperContext.createTaskModel()
    humanTask.taskType = 'HUMAN'
    humanTask.inputData = humanTaskInput
    humanTask.startTime = Date.now()
    humanTask.status = 'IN_PROGRESS'

    return [humanTask]
  }
}
