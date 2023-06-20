import { WorkflowTask } from "../../../common/metadata/workflow/WorkflowTask"
import { ScriptEvaluator } from "../../events/ScriptEvaluator"
import { TerminateWorkflowException } from "../../exception/TerminateWorkflowException"
import { WorkflowModel } from "../../model/WorkflowModel"

export class DecisionTaskMapper implements TaskMapper {
  private static readonly LOGGER = getLogger(DecisionTaskMapper.name)

  getTaskType (): string {
    return 'DECISION'
  }

  getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    DecisionTaskMapper.LOGGER.debug(
      'TaskMapperContext {} in DecisionTaskMapper',
      taskMapperContext
    )
    const tasksToBeScheduled: TaskModel[] = []
    const workflowTask: WorkflowTask = taskMapperContext.getWorkflowTask()
    const workflowModel: WorkflowModel = taskMapperContext.getWorkflowModel()
    const taskInput: Record<string, unknown> = taskMapperContext.getTaskInput()
    const retryCount: number = taskMapperContext.getRetryCount()

    // Get the expression to be evaluated
    const caseValue: string = this.getEvaluatedCaseValue(
      workflowTask,
      taskInput
    )

    const decisionTask: TaskModel = taskMapperContext.createTaskModel()
    decisionTask.setTaskType('TASK_TYPE_DECISION')
    decisionTask.setTaskDefName('TASK_TYPE_DECISION')
    decisionTask.addInput('case', caseValue)
    decisionTask.addOutput('caseOutput', [caseValue])
    decisionTask.setStartTime(Date.now())
    decisionTask.setStatus('IN_PROGRESS')
    tasksToBeScheduled.push(decisionTask)

    let selectedTasks: WorkflowTask[] | null | undefined =
      workflowTask.getDecisionCases()[caseValue]

    if (!selectedTasks || selectedTasks.length === 0) {
      selectedTasks = workflowTask.getDefaultCase()
    }

    if (selectedTasks && selectedTasks.length > 0) {
      const selectedTask: WorkflowTask = selectedTasks[0]
      const caseTasks: TaskModel[] = taskMapperContext
        .getDeciderService()
        .getTasksToBeScheduled(
          workflowModel,
          selectedTask,
          retryCount,
          taskMapperContext.getRetryTaskId()
        )
      tasksToBeScheduled.push(...caseTasks)
      decisionTask.addInput('hasChildren', 'true')
    }

    return tasksToBeScheduled
  }

  @VisibleForTesting
  private getEvaluatedCaseValue (
    workflowTask: WorkflowTask,
    taskInput: Record<string, unknown>
  ): string {
    const expression: string = workflowTask.getCaseExpression()
    let caseValue: string

    if (StringUtils.isNotBlank(expression)) {
      DecisionTaskMapper.LOGGER.debug(
        'Case being evaluated using decision expression: {}',
        expression
      )
      try {
        const returnValue = ScriptEvaluator.eval(expression, taskInput)
        caseValue = returnValue === null ? 'null' : returnValue.toString()
      } catch (e) {
        const errorMsg = `Error while evaluating script: ${expression}`
        DecisionTaskMapper.LOGGER.error(errorMsg, e)
        throw new TerminateWorkflowException(errorMsg)
      }
    } else {
      DecisionTaskMapper.LOGGER.debug(
        'No Expression available on the decision task, case value being assigned as param name'
      )
      const paramName = workflowTask.getCaseValueParam()
      caseValue = '' + taskInput[paramName]
    }

    return caseValue
  }
}
