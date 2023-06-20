import { ScriptEvaluator } from '../../events/ScriptEvaluator'
import { Evaluator } from './Evaluator'

export class JavascriptEvaluator implements Evaluator {
  public static readonly NAME = 'javascript'
  private static readonly LOGGER = getLogger(JavascriptEvaluator.name)

  evaluate (expression: string, input: any): any {
    JavascriptEvaluator.LOGGER.debug(
      'Javascript evaluator -- expression: {}',
      expression
    )
    try {
      // Evaluate the expression by using the Javascript evaluation engine.
      const result = ScriptEvaluator.eval(expression, input)
      JavascriptEvaluator.LOGGER.debug(
        'Javascript evaluator -- result: {}',
        result
      )
      return result
    } catch (e) {
      JavascriptEvaluator.LOGGER.error(
        'Error while evaluating script: {}',
        expression,
        e
      )
      throw new TerminateWorkflowException(e.message)
    }
  }
}
