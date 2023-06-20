import { TerminateWorkflowException } from '...' // Import the TerminateWorkflowException from the appropriate module

class Inline extends WorkflowSystemTask {
  private static readonly LOGGER = LoggerFactory.getLogger(Inline)
  private static readonly QUERY_EVALUATOR_TYPE = 'evaluatorType'
  private static readonly QUERY_EXPRESSION_PARAMETER = 'expression'

  private readonly evaluators: Map<string, Evaluator>

  constructor (evaluators: Map<string, Evaluator>) {
    super(TASK_TYPE_INLINE)
    this.evaluators = evaluators
  }

  execute (
    workflow: WorkflowModel,
    task: TaskModel,
    workflowExecutor: WorkflowExecutor
  ): boolean {
    const taskInput = task.getInputData()
    const evaluatorType = taskInput[QUERY_EVALUATOR_TYPE] as string
    const expression = taskInput[QUERY_EXPRESSION_PARAMETER] as string

    try {
      this.checkEvaluatorType(evaluatorType)
      this.checkExpression(expression)
      const evaluator = this.evaluators.get(evaluatorType)
      const evalResult = evaluator.evaluate(expression, taskInput)
      task.addOutput('result', evalResult)
      task.setStatus(TaskModel.Status.COMPLETED)
    } catch (error) {
      const errorMessage = error.cause?.message || error.message
      Inline.LOGGER.error(
        `Failed to execute Inline Task: ${task.getTaskId()} in workflow: ${workflow.getWorkflowId()}`,
        error
      )
      task.setStatus(
        error instanceof TerminateWorkflowException
          ? TaskModel.Status.FAILED_WITH_TERMINAL_ERROR
          : TaskModel.Status.FAILED
      )
      task.setReasonForIncompletion(errorMessage)
      task.addOutput('error', errorMessage)
    }

    return true
  }

  private checkEvaluatorType (evaluatorType: string): void {
    if (!evaluatorType) {
      Inline.LOGGER.error(
        `Empty ${Inline.QUERY_EVALUATOR_TYPE} in INLINE task.`
      )
      throw new TerminateWorkflowException(
        `Empty '${Inline.QUERY_EVALUATOR_TYPE}' in INLINE task's input parameters. A non-empty String value must be provided.`
      )
    }
    if (!this.evaluators.has(evaluatorType)) {
      Inline.LOGGER.error(
        `Evaluator ${evaluatorType} for INLINE task not registered`
      )
      throw new TerminateWorkflowException(
        `Unknown evaluator '${evaluatorType}' in INLINE task.`
      )
    }
  }

  private checkExpression (expression: string): void {
    if (!expression) {
      Inline.LOGGER.error(
        `Empty ${Inline.QUERY_EXPRESSION_PARAMETER} in INLINE task.`
      )
      throw new TerminateWorkflowException(
        `Empty '${Inline.QUERY_EXPRESSION_PARAMETER}' in Inline task's input parameters. A non-empty String value must be provided.`
      )
    }
  }
}
