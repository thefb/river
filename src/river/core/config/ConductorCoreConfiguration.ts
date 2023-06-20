import { Logger, LoggerOptions } from 'pino'

export class ConductorCoreConfiguration {
  private static LOGGER: Logger

  constructor (loggerOptions?: LoggerOptions) {
    ConductorCoreConfiguration.LOGGER = loggerOptions
      ? pino(loggerOptions)
      : pino()
  }

  public provideLock (): Lock {
    return new NoopLock()
  }

  public dummyExternalPayloadStorage (): ExternalPayloadStorage {
    ConductorCoreConfiguration.LOGGER.info('Initialized dummy payload storage!')
    return new DummyPayloadStorage()
  }

  public workflowStatusListener (): WorkflowStatusListener {
    return new WorkflowStatusListenerStub()
  }

  public taskStatusListener (): TaskStatusListener {
    return new TaskStatusListenerStub()
  }

  public executorService (
    conductorProperties: ConductorProperties
  ): ExecutorService {
    const threadFactory = new BasicThreadFactory.Builder()
      .namingPattern('conductor-worker-%d')
      .daemon(true)
      .build()
    return Executors.newFixedThreadPool(
      conductorProperties.getExecutorServiceMaxThreadCount(),
      threadFactory
    )
  }

  public getTaskMappers (taskMappers: TaskMapper[]): Map<string, TaskMapper> {
    return taskMappers.reduce((map, taskMapper) => {
      map.set(taskMapper.getTaskType(), taskMapper)
      return map
    }, new Map<string, TaskMapper>())
  }

  public asyncSystemTasks (
    allSystemTasks: WorkflowSystemTask[]
  ): Set<WorkflowSystemTask> {
    return allSystemTasks
      .filter(systemTask => systemTask.isAsync())
      .reduce((set, systemTask) => {
        set.add(systemTask)
        return set
      }, new Set<WorkflowSystemTask>())
  }

  public getEventQueueProviders (
    eventQueueProviders: EventQueueProvider[]
  ): Map<string, EventQueueProvider> {
    return eventQueueProviders.reduce((map, eventQueueProvider) => {
      map.set(eventQueueProvider.getQueueType(), eventQueueProvider)
      return map
    }, new Map<string, EventQueueProvider>())
  }

  public onTransientErrorRetryTemplate (): RetryTemplate {
    return RetryTemplate.builder()
      .retryOn(TransientException)
      .maxAttempts(3)
      .noBackoff()
      .build()
  }
}
