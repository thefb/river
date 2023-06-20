import { TaskType } from "../../../common/metadata/workflow/WorkflowDef"
import { WorkflowModel } from "../../model/WorkflowModel"

class SwitchTaskMapper implements TaskMapper {
  private readonly parametersUtils: ParametersUtils
  private readonly metadataDAO: MetadataDAO

  constructor (parametersUtils: ParametersUtils, metadataDAO: MetadataDAO) {
    this.parametersUtils = parametersUtils
    this.metadataDAO = metadataDAO
  }

  getTaskType (): string {
    return TaskType.SWITCH
  }

  getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    console.log(`TaskMapperContext ${taskMapperContext} in SwitchTaskMapper`)
    const workflowTask = taskMapperContext.getWorkflowTask()
    const workflowModel = taskMapperContext.getWorkflowModel()
    const taskId = taskMapperContext.getTaskId()

    const taskInput = taskMapperContext.getTaskInput()
    const switchValue = taskInput['switchValue']
    const caseResults = taskInput['caseResults']
    const defaultCase = taskInput['defaultCase']

    const resolvedCaseResults = this.resolveCaseResults(
      workflowModel,
      caseResults
    )
    const resolvedDefaultCase = this.resolveDefaultCase(
      workflowModel,
      defaultCase
    )

    const switchTask: TaskModel = {
      taskType: TaskType.TASK_TYPE_SWITCH,
      inputData: {
        switchValue,
        caseResults: resolvedCaseResults,
        defaultCase: resolvedDefaultCase
      },
      status: TaskModel.Status.IN_PROGRESS,
      startTime: Date.now()
    }

    console.log(`SwitchTask ${switchTask} created`)
    return [switchTask]
  }

  private resolveCaseResults (
    workflowModel: WorkflowModel,
    caseResults: Map<string, unknown>
  ): Map<string, unknown> {
    const resolvedCaseResults: Map<string, unknown> = new Map()
    for (const [key, value] of caseResults.entries()) {
      const resolvedValue = this.parametersUtils.getTaskInputV2(
        value,
        workflowModel,
        null,
        null
      )
      resolvedCaseResults.set(key, resolvedValue)
    }
    return resolvedCaseResults
  }

  private resolveDefaultCase (
    workflowModel: WorkflowModel,
    defaultCase: unknown
  ): unknown {
    if (defaultCase) {
      return this.parametersUtils.getTaskInputV2(
        defaultCase,
        workflowModel,
        null,
        null
      )
    }
    return null
  }
}

export default SwitchTaskMapper
