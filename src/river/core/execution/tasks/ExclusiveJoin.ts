export class ExclusiveJoin extends WorkflowSystemTask {
  private static readonly LOGGER = LoggerFactory.getLogger(ExclusiveJoin)
  private static readonly DEFAULT_EXCLUSIVE_JOIN_TASKS =
    'defaultExclusiveJoinTask'

  constructor () {
    super(TASK_TYPE_EXCLUSIVE_JOIN)
  }

  execute (
    workflow: WorkflowModel,
    task: TaskModel,
    workflowExecutor: WorkflowExecutor
  ): boolean {
    let foundExlusiveJoinOnTask = false
    let hasFailures = false
    const failureReason = new StringBuilder()
    const taskStatus: TaskModel.Status
    let joinOn: string[] = task.getInputData().joinOn

    if (task.isLoopOverTask()) {
      // If exclusive join is part of loop over task, wait for specific iteration to get complete
      joinOn = joinOn.map(name =>
        TaskUtils.appendIteration(name, task.getIteration())
      )
    }

    let exclusiveTask: TaskModel | null = null

    for (const joinOnRef of joinOn) {
      ExclusiveJoin.LOGGER.debug(`Exclusive Join On Task ${joinOnRef}`)
      exclusiveTask = workflow.getTaskByRefName(joinOnRef)

      if (
        exclusiveTask == null ||
        exclusiveTask.getStatus() === TaskModel.Status.SKIPPED
      ) {
        ExclusiveJoin.LOGGER.debug(
          `The task ${joinOnRef} is either not scheduled or skipped.`
        )
        continue
      }

      taskStatus = exclusiveTask.getStatus()
      foundExlusiveJoinOnTask = taskStatus.isTerminal()
      hasFailures = !taskStatus.isSuccessful()

      if (hasFailures) {
        failureReason
          .append(exclusiveTask.getReasonForIncompletion())
          .append(' ')
      }

      break
    }

    if (!foundExlusiveJoinOnTask) {
      const defaultExclusiveJoinTasks: string[] =
        task.getInputData().DEFAULT_EXCLUSIVE_JOIN_TASKS

      ExclusiveJoin.LOGGER.info(
        `Could not perform exclusive on Join Task(s). Performing now on default exclusive join task(s) ${defaultExclusiveJoinTasks}, workflow: ${workflow.getWorkflowId()}`
      )

      if (
        defaultExclusiveJoinTasks != null &&
        defaultExclusiveJoinTasks.length > 0
      ) {
        for (const defaultExclusiveJoinTask of defaultExclusiveJoinTasks) {
          // Pick the first task that we should join on and break.
          exclusiveTask = workflow.getTaskByRefName(defaultExclusiveJoinTask)

          if (
            exclusiveTask == null ||
            exclusiveTask.getStatus() === TaskModel.Status.SKIPPED
          ) {
            ExclusiveJoin.LOGGER.debug(
              `The task ${defaultExclusiveJoinTask} is either not scheduled or skipped.`
            )
            continue
          }

          taskStatus = exclusiveTask.getStatus()
          foundExlusiveJoinOnTask = taskStatus.isTerminal()
          hasFailures = !taskStatus.isSuccessful()

          if (hasFailures) {
            failureReason
              .append(exclusiveTask.getReasonForIncompletion())
              .append(' ')
          }

          break
        }
      } else {
        ExclusiveJoin.LOGGER.debug(
          'Could not evaluate last tasks output. Verify the task configuration in the workflow definition.'
        )
      }
    }

    ExclusiveJoin.LOGGER.debug(
      `Status of flags: foundExlusiveJoinOnTask: ${foundExlusiveJoinOnTask}, hasFailures ${hasFailures}`
    )

    if (foundExlusiveJoinOnTask || hasFailures) {
      if (hasFailures) {
        task.setReasonForIncompletion(failureReason.toString())
        task.setStatus(TaskModel.Status.FAILED)
      } else {
        task.setOutputData(exclusiveTask.getOutputData())
        task.setStatus(TaskModel.Status.COMPLETED)
      }

      ExclusiveJoin.LOGGER.debug(
        `Task: ${task.getTaskId()} status is: ${task.getStatus()}`
      )
      return true
    }

    return false
  }
}
