import {
  MetadataService,
  TaskDef,
  WorkflowSystemTask,
  SystemTaskWorker
} from '...' // Import the required dependencies

class IsolatedTaskQueueProducer {
  private static readonly LOGGER = LoggerFactory.getLogger(
    IsolatedTaskQueueProducer
  )

  private readonly metadataService: MetadataService
  private readonly asyncSystemTasks: Set<WorkflowSystemTask>
  private readonly systemTaskWorker: SystemTaskWorker
  private readonly listeningQueues: Set<string>

  constructor (
    metadataService: MetadataService,
    asyncSystemTasks: Set<WorkflowSystemTask>,
    systemTaskWorker: SystemTaskWorker,
    isolatedSystemTaskEnabled: boolean,
    isolatedSystemTaskQueuePollInterval: number
  ) {
    this.metadataService = metadataService
    this.asyncSystemTasks = asyncSystemTasks
    this.systemTaskWorker = systemTaskWorker
    this.listeningQueues = new Set<string>()

    if (isolatedSystemTaskEnabled) {
      IsolatedTaskQueueProducer.LOGGER.info('Listening for isolation groups')

      setInterval(
        () => this.addTaskQueues(),
        isolatedSystemTaskQueuePollInterval
      )
    } else {
      IsolatedTaskQueueProducer.LOGGER.info(
        'Isolated System Task Worker DISABLED'
      )
    }
  }

  private getIsolationExecutionNameSpaces (): Set<TaskDef> {
    let isolationExecutionNameSpaces = new Set<TaskDef>()
    try {
      const taskDefs = this.metadataService.getTaskDefs()
      isolationExecutionNameSpaces = new Set<TaskDef>(
        taskDefs.filter(
          taskDef => taskDef.isolationGroupId || taskDef.executionNameSpace
        )
      )
    } catch (error) {
      IsolatedTaskQueueProducer.LOGGER.error(
        'Unknown exception received in getting isolation groups, sleeping and retrying',
        error
      )
    }
    return isolationExecutionNameSpaces
  }

  private addTaskQueues (): void {
    const isolationTaskDefs = this.getIsolationExecutionNameSpaces()
    IsolatedTaskQueueProducer.LOGGER.debug(
      'Retrieved queues',
      isolationTaskDefs
    )

    for (const isolatedTaskDef of isolationTaskDefs) {
      for (const systemTask of this.asyncSystemTasks) {
        const taskQueue = QueueUtils.getQueueName(
          systemTask.getTaskType(),
          null,
          isolatedTaskDef.isolationGroupId,
          isolatedTaskDef.executionNameSpace
        )
        IsolatedTaskQueueProducer.LOGGER.debug(
          `Adding taskQueue:'${taskQueue}' to system task worker coordinator`
        )
        if (!this.listeningQueues.has(taskQueue)) {
          this.systemTaskWorker.startPolling(systemTask, taskQueue)
          this.listeningQueues.add(taskQueue)
        }
      }
    }
  }
}
