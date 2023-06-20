import { TaskDef } from "../../common/metadata/tasks/TaskDef"
import { TaskType, TimeoutPolicy } from "../../common/metadata/workflow/WorkflowDef"
import { TerminateWorkflowException } from "../exception/TerminateWorkflowException"
import { WorkflowModel } from "../model/WorkflowModel"

export class DeciderService {
  private static readonly LOGGER = getLogger(DeciderService.name)

  private readonly idGenerator: IDGenerator
  private readonly parametersUtils: ParametersUtils
  private readonly externalPayloadStorageUtils: ExternalPayloadStorageUtils
  private readonly metadataDAO: MetadataDAO
  private readonly systemTaskRegistry: SystemTaskRegistry
  private readonly taskPendingTimeThresholdMins: number

  private readonly taskMappers: Map<string, TaskMapper>

  constructor (
    idGenerator: IDGenerator,
    parametersUtils: ParametersUtils,
    metadataDAO: MetadataDAO,
    externalPayloadStorageUtils: ExternalPayloadStorageUtils,
    systemTaskRegistry: SystemTaskRegistry,
    taskMappers: Map<string, TaskMapper>,
    taskPendingTimeThreshold: Duration = Duration.fromMinutes(60)
  ) {
    this.idGenerator = idGenerator
    this.metadataDAO = metadataDAO
    this.parametersUtils = parametersUtils
    this.taskMappers = taskMappers
    this.externalPayloadStorageUtils = externalPayloadStorageUtils
    this.taskPendingTimeThresholdMins = taskPendingTimeThreshold.toMinutes()
    this.systemTaskRegistry = systemTaskRegistry
  }

  decide (workflow: WorkflowModel): DeciderOutcome {
    const tasks: TaskModel[] = workflow.getTasks()
    const unprocessedTasks = tasks.filter(
      t => !t.getStatus().equals(SKIPPED) && !t.isExecuted()
    )

    let tasksToBeScheduled: TaskModel[] = []
    if (unprocessedTasks.length === 0) {
      tasksToBeScheduled = this.startWorkflow(workflow) || []
    }

    return this.decide(workflow, tasksToBeScheduled)
  }

  private decideWorkflow (
    workflow: WorkflowModel,
    preScheduledTasks: TaskModel[]
  ): DeciderOutcome {
    const outcome = new DeciderOutcome()

    if (workflow.getStatus().isTerminal()) {
      DeciderService.LOGGER.debug(
        `Workflow ${workflow} is already finished. Reason: ${workflow.getReasonForIncompletion()}`
      )
      return outcome
    }

    this.checkWorkflowTimeout(workflow)

    if (workflow.getStatus().equals(WorkflowModel.Status.PAUSED)) {
      DeciderService.LOGGER.debug(
        `Workflow ${workflow.getWorkflowId()} is paused`
      )
      return outcome
    }

    const pendingTasks: TaskModel[] = []
    const executedTaskRefNames = new Set<string>()
    let hasSuccessfulTerminateTask = false

    for (const task of workflow.getTasks()) {
      if (
        !task.isRetried() &&
        !task.getStatus().equals(SKIPPED) &&
        !task.isExecuted()
      ) {
        pendingTasks.push(task)
      }

      if (task.isExecuted()) {
        executedTaskRefNames.add(task.getReferenceTaskName())
      }

      if (
        TERMINATE.name().equals(task.getTaskType()) &&
        task.getStatus().isTerminal() &&
        task.getStatus().isSuccessful()
      ) {
        hasSuccessfulTerminateTask = true
        outcome.terminateTask = task
      }
    }

    const tasksToBeScheduled: Record<string, TaskModel> = {}

    for (const preScheduledTask of preScheduledTasks) {
      tasksToBeScheduled[preScheduledTask.getReferenceTaskName()] =
        preScheduledTask
    }

    for (const pendingTask of pendingTasks) {
      if (
        this.systemTaskRegistry.isSystemTask(pendingTask.getTaskType()) &&
        !pendingTask.getStatus().isTerminal()
      ) {
        tasksToBeScheduled[pendingTask.getReferenceTaskName()] = pendingTask
        executedTaskRefNames.delete(pendingTask.getReferenceTaskName())
      }

      let taskDefinition = pendingTask.getTaskDefinition()
      if (!taskDefinition) {
        taskDefinition = workflow
          .getWorkflowDefinition()
          .getTaskByRefName(pendingTask.getReferenceTaskName())
          ?.getTaskDefinition()
      }

      if (taskDefinition) {
        this.checkTaskTimeout(taskDefinition, pendingTask)
        this.checkTaskPollTimeout(taskDefinition, pendingTask)

        if (this.isResponseTimedOut(taskDefinition, pendingTask)) {
          this.timeoutTask(taskDefinition, pendingTask)
        }
      }

      if (!pendingTask.getStatus().isSuccessful()) {
        let workflowTask = pendingTask.getWorkflowTask()

        if (!workflowTask) {
          workflowTask = workflow
            .getWorkflowDefinition()
            .getTaskByRefName(pendingTask.getReferenceTaskName())
        }

        const retryTask = this.retry(
          taskDefinition,
          workflowTask,
          pendingTask,
          workflow
        )

        if (retryTask) {
          tasksToBeScheduled[retryTask.getReferenceTaskName()] = retryTask
          executedTaskRefNames.delete(retryTask.getReferenceTaskName())
          outcome.tasksToBeUpdated.push(pendingTask)
        } else {
          pendingTask.setStatus(COMPLETED_WITH_ERRORS)
        }
      }

      if (
        !pendingTask.isExecuted() &&
        !pendingTask.isRetried() &&
        pendingTask.getStatus().isTerminal()
      ) {
        pendingTask.setExecuted(true)
        const nextTasks = this.getNextTask(workflow, pendingTask)

        if (
          pendingTask.isLoopOverTask() &&
          !TaskType.DO_WHILE.name().equals(pendingTask.getTaskType()) &&
          nextTasks.length > 0
        ) {
          const filteredNextTasks = this.filterNextLoopOverTasks(
            nextTasks,
            pendingTask,
            workflow
          )
          nextTasks.push(...filteredNextTasks)
        }

        for (const nextTask of nextTasks) {
          if (!tasksToBeScheduled[nextTask.getReferenceTaskName()]) {
            tasksToBeScheduled[nextTask.getReferenceTaskName()] = nextTask
          }
        }

        outcome.tasksToBeUpdated.push(pendingTask)

        DeciderService.LOGGER.debug(
          `Scheduling Tasks from ${pendingTask.getTaskDefName()}, next = ${nextTasks.map(
            task => task.getTaskDefName()
          )} for workflowId: ${workflow.getWorkflowId()}`
        )
      }
    }

    return outcome
  }

  private checkWorkflowTimeout (workflow: WorkflowModel): void {
    const workflowDef = workflow.getWorkflowDefinition()
    if (!workflowDef) {
      console.warn(`Missing workflow definition: ${workflow.getWorkflowId()}`)
      return
    }
    if (
      workflow.getStatus().isTerminal() ||
      workflowDef.getTimeoutSeconds() <= 0
    ) {
      return
    }

    const timeout = 1000 * workflowDef.getTimeoutSeconds()
    const now = Date.now()
    const elapsedTime =
      workflow.getLastRetriedTime() > 0
        ? now - workflow.getLastRetriedTime()
        : now - workflow.getCreateTime()

    if (elapsedTime < timeout) {
      return
    }

    const reason = `Workflow timed out after ${
      elapsedTime / 1000
    } seconds. Timeout configured as ${workflowDef.getTimeoutSeconds()} seconds. Timeout policy configured to ${workflowDef.getTimeoutPolicy()}`

    switch (workflowDef.getTimeoutPolicy()) {
      case TimeoutPolicy.ALERT_ONLY:
        console.log(`${workflow.getWorkflowId()} ${reason}`)
        Monitors.recordWorkflowTermination(
          workflow.getWorkflowName(),
          WorkflowModel.Status.TIMED_OUT,
          workflow.getOwnerApp()
        )
        return
      case TimeoutPolicy.TIME_OUT_WF:
        throw new TerminateWorkflowException(
          reason,
          WorkflowModel.Status.TIMED_OUT
        )
    }
  }

  private checkTaskTimeout (taskDefinition: TaskDef, task: TaskModel): void {
    if (!taskDefinition) {
      console.warn(
        `Missing task definition for task: ${task.getTaskId()}/${task.getTaskDefName()} in workflow: ${task.getWorkflowInstanceId()}`
      )
      return
    }
    if (
      task.getStatus().isTerminal() ||
      taskDefinition.getTimeoutSeconds() <= 0 ||
      task.getStartTime() <= 0
    ) {
      return
    }

    const timeout = 1000 * taskDefinition.getTimeoutSeconds()
    const now = Date.now()
    const elapsedTime =
      now - (task.getStartTime() + task.getStartDelayInSeconds() * 1000)

    if (elapsedTime < timeout) {
      return
    }

    const reason = `Task timed out after ${
      elapsedTime / 1000
    } seconds. Timeout configured as ${taskDefinition.getTimeoutSeconds()} seconds. Timeout policy configured to ${taskDefinition.getTimeoutPolicy()}`
    timeoutTaskWithTimeoutPolicy(reason, taskDefinition, task)
  }
  private checkTaskPollTimeout (taskDefinition: TaskDef, task: TaskModel): void {
    if (!taskDefinition) {
      console.warn(
        `Missing task definition for task: ${task.getTaskId()}/${task.getTaskDefName()} in workflow: ${task.getWorkflowInstanceId()}`
      )
      return
    }
    if (
      !taskDefinition.getPollTimeoutSeconds() ||
      taskDefinition.getPollTimeoutSeconds() <= 0 ||
      !task.getStatus().equals(TaskModel.Status.SCHEDULED)
    ) {
      return
    }

    const pollTimeout = 1000 * taskDefinition.getPollTimeoutSeconds()
    const adjustedPollTimeout =
      pollTimeout + task.getCallbackAfterSeconds() * 1000
    const now = Date.now()
    const pollElapsedTime =
      now - (task.getScheduledTime() + task.getStartDelayInSeconds() * 1000)

    if (pollElapsedTime < adjustedPollTimeout) {
      return
    }

    const reason = `Task poll timed out after ${
      pollElapsedTime / 1000
    } seconds. Poll timeout configured as ${
      pollTimeout / 1000
    } seconds. Timeout policy configured to ${taskDefinition.getTimeoutPolicy()}`
    timeoutTaskWithTimeoutPolicy(reason, taskDefinition, task)
  }

  private timeoutTaskWithTimeoutPolicy (
    reason: string,
    taskDefinition: TaskDef,
    task: TaskModel
  ): void {
    Monitors.recordTaskTimeout(task.getTaskDefName())

    switch (taskDefinition.getTimeoutPolicy()) {
      case TimeoutPolicy.ALERT_ONLY:
        console.log(reason)
        return
      case TimeoutPolicy.RETRY:
        task.setStatus(TaskModel.Status.TIMED_OUT)
        task.setReasonForIncompletion(reason)
        return
      case TimeoutPolicy.TIME_OUT_WF:
        task.setStatus(TaskModel.Status.TIMED_OUT)
        task.setReasonForIncompletion(reason)
        throw new TerminateWorkflowException(
          reason,
          WorkflowModel.Status.TIMED_OUT,
          task
        )
    }
  }

  private isResponseTimedOut (
    taskDefinition: TaskDef,
    task: TaskModel
  ): boolean {
    if (!taskDefinition) {
      console.warn(
        `Missing task type: ${task.getTaskDefName()}, workflowId= ${task.getWorkflowInstanceId()}`
      )
      return false
    }

    if (task.getStatus().isTerminal() || isAyncCompleteSystemTask(task)) {
      return false
    }

    const now = Date.now()
    const callbackTime = 1000 * task.getCallbackAfterSeconds()
    const referenceTime =
      task.getUpdateTime() > 0 ? task.getUpdateTime() : task.getScheduledTime()
    const noResponseTime = now - referenceTime

    Monitors.recordTaskPendingTime(
      task.getTaskType(),
      task.getWorkflowType(),
      noResponseTime
    )
    const thresholdMS = this.taskPendingTimeThresholdMins * 60 * 1000

    if (noResponseTime > thresholdMS) {
      console.warn(
        `Task: ${task.getTaskId()} of type: ${task.getTaskType()} in workflow: ${task.getWorkflowInstanceId()}/${task.getWorkflowType()} is in pending state for longer than ${thresholdMS} ms`
      )
    }

    if (
      !task.getStatus().equals(TaskModel.Status.IN_PROGRESS) ||
      taskDefinition.getResponseTimeoutSeconds() === 0
    ) {
      return false
    }

    console.debug(
      `Evaluating responseTimeOut for Task: ${task}, with Task Definition: ${taskDefinition}`
    )
    const responseTimeout = 1000 * taskDefinition.getResponseTimeoutSeconds()
    const adjustedResponseTimeout = responseTimeout + callbackTime
    const noResponseTimeSeconds = noResponseTime / 1000

    if (noResponseTimeSeconds < adjustedResponseTimeout) {
      console.debug(
        `Current responseTime: ${noResponseTimeSeconds} has not exceeded the configured responseTimeout of ${responseTimeout} for the Task: ${task} with Task Definition: ${taskDefinition}`
      )
      return false
    }

    Monitors.recordTaskResponseTimeout(task.getTaskDefName())
    return true
  }

  private timeoutTask (taskDefinition: TaskDef, task: TaskModel): void {
    const reason = `responseTimeout: ${taskDefinition.getResponseTimeoutSeconds()} exceeded for the taskId: ${task.getTaskId()} with Task Definition: ${task.getTaskDefName()}`
    console.debug(reason)
    task.setStatus(TaskModel.Status.TIMED_OUT)
    task.setReasonForIncompletion(reason)
  }
}
