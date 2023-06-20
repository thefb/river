import { Logger } from "pino"
import { ConductorProperties } from "../config/ConductorProperties"
import ExecutionDAOFacade from "../dal/ExecutionDAOFacade"
import { WorkflowModel } from "../model/WorkflowModel"
import { WorkflowExecutor } from "./WorkflowExecutor"

export class AsyncSystemTaskExecutor {
  private readonly executionDAOFacade: ExecutionDAOFacade
  private readonly queueDAO: QueueDAO
  private readonly metadataDAO: MetadataDAO
  private readonly queueTaskMessagePostponeSecs: number
  private readonly systemTaskCallbackTime: number
  private readonly workflowExecutor: WorkflowExecutor

  private static readonly LOGGER: Logger = LoggerFactory.getLogger(
    AsyncSystemTaskExecutor
  )

  constructor (
    executionDAOFacade: ExecutionDAOFacade,
    queueDAO: QueueDAO,
    metadataDAO: MetadataDAO,
    conductorProperties: ConductorProperties,
    workflowExecutor: WorkflowExecutor
  ) {
    this.executionDAOFacade = executionDAOFacade
    this.queueDAO = queueDAO
    this.metadataDAO = metadataDAO
    this.workflowExecutor = workflowExecutor
    this.systemTaskCallbackTime =
      conductorProperties.systemTaskWorkerCallbackDuration.getSeconds()
    this.queueTaskMessagePostponeSecs =
      conductorProperties.taskExecutionPostponeDuration.getSeconds()
  }

  /**
   * Executes and persists the results of an async {@link WorkflowSystemTask}.
   *
   * @param systemTask The {@link WorkflowSystemTask} to be executed.
   * @param taskId The id of the {@link TaskModel} object.
   */
  execute (systemTask: WorkflowSystemTask, taskId: string): void {
    const task: TaskModel | null = this.loadTaskQuietly(taskId)
    if (task === null) {
      AsyncSystemTaskExecutor.LOGGER.error(
        `TaskId: ${taskId} could not be found while executing ${systemTask}`
      )
      try {
        AsyncSystemTaskExecutor.LOGGER.debug(
          'Cleaning up dead task from queue message: taskQueue={}, taskId={}',
          systemTask.getTaskType(),
          taskId
        )
        this.queueDAO.remove(systemTask.getTaskType(), taskId)
      } catch (e) {
        AsyncSystemTaskExecutor.LOGGER.error(
          'Failed to remove dead task from queue message: taskQueue={}, taskId={}',
          systemTask.getTaskType(),
          taskId
        )
      }
      return
    }

    AsyncSystemTaskExecutor.LOGGER.debug(
      'Task: {} fetched from execution DAO for taskId: {}',
      task,
      taskId
    )
    const queueName: string = QueueUtils.getQueueName(task)
    if (task.getStatus().isTerminal()) {
      // Tune the SystemTaskWorkerCoordinator's queues - if the queue size is very big this can happen!
      AsyncSystemTaskExecutor.LOGGER.info(
        'Task {}/{} was already completed.',
        task.getTaskType(),
        task.getTaskId()
      )
      this.queueDAO.remove(queueName, task.getTaskId())
      return
    }

    if (task.getStatus().equals(TaskModel.Status.SCHEDULED)) {
      if (this.executionDAOFacade.exceedsInProgressLimit(task)) {
        AsyncSystemTaskExecutor.LOGGER.warn(
          'Concurrent Execution limited for {}:{}',
          taskId,
          task.getTaskDefName()
        )
        this.postponeQuietly(queueName, task)
        return
      }
      if (
        task.getRateLimitPerFrequency() > 0 &&
        this.executionDAOFacade.exceedsRateLimitPerFrequency(
          task,
          this.metadataDAO.getTaskDef(task.getTaskDefName())
        )
      ) {
        AsyncSystemTaskExecutor.LOGGER.warn(
          'RateLimit Execution limited for {}:{}, limit:{}',
          taskId,
          task.getTaskDefName(),
          task.getRateLimitPerFrequency()
        )
        this.postponeQuietly(queueName, task)
        return
      }
    }

    let hasTaskExecutionCompleted = false
    const workflowId = task.getWorkflowInstanceId()
    // if we are here the Task object is updated and needs to be persisted regardless of an exception
    try {
      const workflow: WorkflowModel = this.executionDAOFacade.getWorkflowModel(
        workflowId,
        systemTask.isTaskRetrievalRequired()
      )

      if (workflow.getStatus().isTerminal()) {
        AsyncSystemTaskExecutor.LOGGER.info(
          'Workflow {} has been completed for {}/{}',
          workflow.toShortString(),
          systemTask,
          task.getTaskId()
        )
        if (!task.getStatus().isTerminal()) {
          task.setStatus(TaskModel.Status.CANCELED)
          task.setReasonForIncompletion(
            `Workflow is in ${workflow.getStatus().toString()} state`
          )
        }
        this.queueDAO.remove(queueName, task.getTaskId())
        return
      }

      AsyncSystemTaskExecutor.LOGGER.debug(
        'Executing {}/{} in {} state',
        task.getTaskType(),
        task.getTaskId(),
        task.getStatus()
      )

      const isTaskAsyncComplete: boolean = systemTask.isAsyncComplete(task)
      if (
        task.getStatus() === TaskModel.Status.SCHEDULED ||
        !isTaskAsyncComplete
      ) {
        task.incrementPollCount()
      }

      if (task.getStatus() === TaskModel.Status.SCHEDULED) {
        task.setStartTime(Date.now())
        Monitors.recordQueueWaitTime(
          task.getTaskType(),
          task.getQueueWaitTime()
        )
        systemTask.start(workflow, task, this.workflowExecutor)
      } else if (task.getStatus() === TaskModel.Status.IN_PROGRESS) {
        systemTask.execute(workflow, task, this.workflowExecutor)
      }

      // Update message in Task queue based on Task status
      // Remove asyncComplete system tasks from the queue that are not in SCHEDULED state
      if (
        isTaskAsyncComplete &&
        task.getStatus() !== TaskModel.Status.SCHEDULED
      ) {
        this.queueDAO.remove(queueName, task.getTaskId())
        hasTaskExecutionCompleted = true
      } else if (task.getStatus().isTerminal()) {
        task.setEndTime(Date.now())
        this.queueDAO.remove(queueName, task.getTaskId())
        hasTaskExecutionCompleted = true
        AsyncSystemTaskExecutor.LOGGER.debug(
          '{} removed from queue: {}',
          task,
          queueName
        )
      } else {
        task.setCallbackAfterSeconds(this.systemTaskCallbackTime)
        systemTask
          .getEvaluationOffset(task, this.systemTaskCallbackTime)
          .ifPresentOrElse(
            offset => {
              task.setCallbackAfterSeconds(offset)
            },
            () => {
              task.setCallbackAfterSeconds(this.systemTaskCallbackTime)
            }
          )
        this.queueDAO.postpone(
          queueName,
          task.getTaskId(),
          task.getWorkflowPriority(),
          task.getCallbackAfterSeconds()
        )
        AsyncSystemTaskExecutor.LOGGER.debug(
          '{} postponed in queue: {}',
          task,
          queueName
        )
      }

      AsyncSystemTaskExecutor.LOGGER.debug(
        'Finished execution of {}/{}-{}',
        systemTask,
        task.getTaskId(),
        task.getStatus()
      )
    } catch (e) {
      Monitors.error(AsyncSystemTaskExecutor.name, 'executeSystemTask')
      AsyncSystemTaskExecutor.LOGGER.error(
        `Error executing system task - ${systemTask}, with id: ${taskId}`,
        e
      )
    } finally {
      this.executionDAOFacade.updateTask(task)
      // if the current task execution has completed, then the workflow needs to be evaluated
      if (hasTaskExecutionCompleted) {
        this.workflowExecutor.decide(workflowId)
      }
    }
  }

  private postponeQuietly (queueName: string, task: TaskModel): void {
    try {
      this.queueDAO.postpone(
        queueName,
        task.getTaskId(),
        task.getWorkflowPriority(),
        this.queueTaskMessagePostponeSecs
      )
    } catch (e) {
      AsyncSystemTaskExecutor.LOGGER.error(
        `Error postponing task: ${task.getTaskId()} in queue: ${queueName}`
      )
    }
  }

  private loadTaskQuietly (taskId: string): TaskModel | null {
    try {
      return this.executionDAOFacade.getTaskModel(taskId)
    } catch (e) {
      return null
    }
  }
}
