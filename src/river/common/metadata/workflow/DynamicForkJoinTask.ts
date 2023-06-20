import { TaskType } from "../tasks/TaskType";

export class DynamicForkJoinTask {
  taskName: string;
  workflowName: string;
  referenceName: string;
  input: Record<string, any> = {};
  type: TaskType = TaskType.SIMPLE;

  constructor(
    taskName: string,
    workflowName: string,
    referenceName: string,
    input: Record<string, any>
  ) {
    this.taskName = taskName;
    this.workflowName = workflowName;
    this.referenceName = referenceName;
    this.input = input;
  }

}
