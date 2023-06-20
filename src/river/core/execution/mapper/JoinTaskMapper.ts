import { WorkflowTask } from '../../../common/metadata/workflow/WorkflowTask'

export class JoinTaskMapper implements TaskMapper {
  getTaskType (): string {
    return 'JOIN'
  }

  getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    const workflowTask: WorkflowTask = taskMapperContext.workflowTask

    const joinInput: Record<string, any> = {
      joinOn: workflowTask.joinOn
    }

    const joinTask: TaskModel = taskMapperContext.createTaskModel()
    joinTask.taskType = 'TASK_TYPE_JOIN'
    joinTask.taskDefName = 'TASK_TYPE_JOIN'
    joinTask.startTime = Date.now()
    joinTask.inputData = joinInput
    joinTask.status = 'IN_PROGRESS'

    return [joinTask]
  }
}
