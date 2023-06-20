export class TaskUtils {
  private static readonly LOOP_TASK_DELIMITER = '__'

  public static appendIteration (name: string, iteration: number): string {
    return name + TaskUtils.LOOP_TASK_DELIMITER + iteration
  }

  public static getLoopOverTaskRefNameSuffix (iteration: number): string {
    return TaskUtils.LOOP_TASK_DELIMITER + iteration
  }

  public static removeIterationFromTaskRefName (
    referenceTaskName: string
  ): string {
    const tokens = referenceTaskName.split(TaskUtils.LOOP_TASK_DELIMITER)
    return tokens.length > 0 ? tokens[0] : referenceTaskName
  }
}
