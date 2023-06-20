export enum SystemParameters {
  CPEWF_TASK_ID = 'CPEWF_TASK_ID',
  NETFLIX_ENV = 'NETFLIX_ENV',
  NETFLIX_STACK = 'NETFLIX_STACK'
}

export class EnvUtils {
  public static isEnvironmentVariable (test: string): boolean {
    return Object.values(SystemParameters).includes(test as SystemParameters)
  }

  public static getSystemParametersValue (
    sysParam: string,
    taskId: string
  ): string | null {
    if (sysParam === SystemParameters.CPEWF_TASK_ID) {
      return taskId
    }

    let value = process.env[sysParam]
    if (value === undefined) {
      value = process.env[sysParam]
    }
    return value ?? null
  }
}
