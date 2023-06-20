import { WorkflowTask } from '../../../common/metadata/workflow/WorkflowTask'
import { TerminateWorkflowException } from '../../exception/TerminateWorkflowException'
import { WorkflowModel } from '../../model/WorkflowModel'

export class ForkJoinTaskMapper implements TaskMapper {
  getTaskType (): string {
    return 'FORK_JOIN'
  }

  getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    console.debug(
      `TaskMapperContext ${taskMapperContext} in ForkJoinTaskMapper`
    )

    const workflowTask: WorkflowTask = taskMapperContext.workflowTask
    const taskInput: Record<string, any> = taskMapperContext.taskInput
    const workflowModel: WorkflowModel = taskMapperContext.workflowModel
    const retryCount: number = taskMapperContext.retryCount

    const tasksToBeScheduled: TaskModel[] = []
    const forkTask: TaskModel = taskMapperContext.createTaskModel()
    forkTask.taskType = 'TASK_TYPE_FORK'
    forkTask.taskDefName = 'TASK_TYPE_FORK'
    const epochMillis: number = Date.now()
    forkTask.startTime = epochMillis
    forkTask.endTime = epochMillis
    forkTask.inputData = taskInput
    forkTask.status = 'COMPLETED'

    tasksToBeScheduled.push(forkTask)
    const forkTasks: WorkflowTask[][] = workflowTask.forkTasks
    for (const wfts of forkTasks) {
      const wft: WorkflowTask = wfts[0]
      const tasks2: TaskModel[] =
        taskMapperContext.deciderService.getTasksToBeScheduled(
          workflowModel,
          wft,
          retryCount
        )
      tasksToBeScheduled.push(...tasks2)
    }

    const joinWorkflowTask: WorkflowTask =
      workflowModel.workflowDefinition.getNextTask(
        workflowTask.taskReferenceName
      )

    if (!joinWorkflowTask || joinWorkflowTask.type !== 'JOIN') {
      throw new TerminateWorkflowException(
        'Fork task definition is not followed by a join task. Check the blueprint'
      )
    }

    const joinTask: TaskModel[] =
      taskMapperContext.deciderService.getTasksToBeScheduled(
        workflowModel,
        joinWorkflowTask,
        retryCount
      )

    tasksToBeScheduled.push(...joinTask)
    return tasksToBeScheduled
  }
}
