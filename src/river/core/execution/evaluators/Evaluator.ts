export interface Evaluator {
  /**
   * Evaluate the expression using the inputs provided, if required. Evaluation of the expression
   * depends on the type of the evaluator.
   *
   * @param expression Expression to be evaluated.
   * @param input Input object to the evaluator to help evaluate the expression.
   * @return Return the evaluation result.
   */
  evaluate(expression: string, input: any): any
}
