import { TerminateWorkflowException } from '../../exception/TerminateWorkflowException'
import { Evaluator } from './Evaluator'

export class ValueParamEvaluator implements Evaluator {
  public static readonly NAME = 'value-param'
  private static readonly LOGGER = getLogger(ValueParamEvaluator.name)

  evaluate (expression: string, input: any): any {
    ValueParamEvaluator.LOGGER.debug(
      'ValueParam evaluator -- evaluating: {}',
      expression
    )
    if (typeof input === 'object' && input !== null) {
      const result = input[expression]
      ValueParamEvaluator.LOGGER.debug(
        'ValueParam evaluator -- result: {}',
        result
      )
      return result
    } else {
      const errorMsg = `Input has to be a JSON object: ${typeof input}`
      ValueParamEvaluator.LOGGER.error(errorMsg)
      throw new TerminateWorkflowException(errorMsg)
    }
  }
}
