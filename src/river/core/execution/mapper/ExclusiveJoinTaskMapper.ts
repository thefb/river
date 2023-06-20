export class ExclusiveJoinTaskMapper implements TaskMapper {
  private static readonly LOGGER = getLogger(ExclusiveJoinTaskMapper.name)

  getTaskType (): string {
    return 'EXCLUSIVE_JOIN'
  }

  getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    ExclusiveJoinTaskMapper.LOGGER.debug(
      'TaskMapperContext {} in ExclusiveJoinTaskMapper',
      taskMapperContext
    )

    const workflowTask: WorkflowTask = taskMapperContext.getWorkflowTask()

    const joinInput: Record<string, unknown> = new Map<string, unknown>()
    joinInput.set('joinOn', workflowTask.getJoinOn())

    if (workflowTask.getDefaultExclusiveJoinTask() != null) {
      joinInput.set(
        'defaultExclusiveJoinTask',
        workflowTask.getDefaultExclusiveJoinTask()
      )
    }

    const joinTask: TaskModel = taskMapperContext.createTaskModel()
    joinTask.setTaskType('EXCLUSIVE_JOIN')
    joinTask.setTaskDefName('EXCLUSIVE_JOIN')
    joinTask.setStartTime(Date.now())
    joinTask.setInputData(joinInput)
    joinTask.setStatus('IN_PROGRESS')

    return [joinTask]
  }
}
