import {
  ScriptEngine,
  ScriptEngineManager,
  ScriptException,
  Bindings
} from 'your-script-engine-library' // Replace with your actual script engine library

export class ScriptEvaluator {
  private static readonly engine: ScriptEngine =
    new ScriptEngineManager().getEngineByName('nashorn')

  private constructor () {}

  static evalBool (script: string, input: any): boolean {
    return ScriptEvaluator.toBoolean(ScriptEvaluator.eval(script, input))
  }

  static eval (script: string, input: any): any {
    const bindings: Bindings = ScriptEvaluator.engine.createBindings()
    bindings.put('$', input)
    return ScriptEvaluator.engine.eval(script, bindings)
  }

  static toBoolean (input: any): boolean {
    if (typeof input === 'boolean') {
      return input
    } else if (typeof input === 'number') {
      return input > 0
    }
    return false
  }
}
