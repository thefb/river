import { WorkflowDef } from "../metadata/workflow/WorkflowDef";
import { EnvUtils } from "./EnvUtils";

export class ConstraintParamUtil {
  public static validateInputParam(
    input: Record<string, unknown>,
    taskName: string,
    workflow: WorkflowDef
  ): string[] {
    const errorList: string[] = [];

    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "string") {
        errorList.push(
          ...ConstraintParamUtil.extractParamPathComponentsFromString(
            key,
            value as string,
            taskName,
            workflow
          )
        );
      } else if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          errorList.push(
            ...ConstraintParamUtil.extractListInputParam(
              key,
              value as unknown[],
              taskName,
              workflow
            )
          );
        } else {
          errorList.push(
            ...ConstraintParamUtil.validateInputParam(
              value as Record<string, unknown>,
              taskName,
              workflow
            )
          );
        }
      }
    }

    return errorList;
  }

  private static extractListInputParam(
    key: string,
    values: unknown[],
    taskName: string,
    workflow: WorkflowDef
  ): string[] {
    const errorList: string[] = [];

    for (const listVal of values) {
      if (typeof listVal === "string") {
        errorList.push(
          ...ConstraintParamUtil.extractParamPathComponentsFromString(
            key,
            listVal as string,
            taskName,
            workflow
          )
        );
      } else if (typeof listVal === "object" && listVal !== null) {
        if (Array.isArray(listVal)) {
          errorList.push(
            ...ConstraintParamUtil.extractListInputParam(
              key,
              listVal as unknown[],
              taskName,
              workflow
            )
          );
        } else {
          errorList.push(
            ...ConstraintParamUtil.validateInputParam(
              listVal as Record<string, unknown>,
              taskName,
              workflow
            )
          );
        }
      }
    }

    return errorList;
  }

  private static extractParamPathComponentsFromString(
    key: string,
    value: string,
    taskName: string,
    workflow: WorkflowDef
  ): string[] {
    const errorList: string[] = [];

    if (value === null) {
      const message = `key: ${key} input parameter value: is null`;
      errorList.push(message);
      return errorList;
    }

    const values = value.split(/(?=(?<!\\)\$\{)|(?<=\})/);

    for (const s of values) {
      if (s.startsWith("${") && s.endsWith("}")) {
        const paramPath = s.substring(2, s.length - 1);

        if (/\s/.test(paramPath)) {
          const message = `key: ${key} input parameter value: ${paramPath} is not valid`;
          errorList.push(message);
        } else if (EnvUtils.isEnvironmentVariable(paramPath)) {
          const sysValue = EnvUtils.getSystemParametersValue(paramPath, "");
          if (sysValue === null) {
            const errorMessage =
              `environment variable: ${paramPath} for given task: ${taskName}` +
              ` input value: ${key} of input parameter: ${value} is not valid`;
            errorList.push(errorMessage);
          }
        } else {
          const components = paramPath.split(".");
          if (components[0] !== "workflow") {
            const task = workflow.getTaskByRefName(components[0]);
            if (task === null) {
              const message =
                `taskReferenceName: ${components[0]} for given task: ${taskName}` +
                ` input value: ${key} of input parameter: ${value}` +
                ` is not defined in workflow definition.`;
              errorList.push(message);
            }
          }
        }
      }
    }

    return errorList;
  }
}
