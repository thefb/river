import { ObservableQueue, Message } from 'your-messaging-library' // Replace with your actual messaging library

export interface Action {
  action: string
  // Add other properties as needed
}

export interface EventHandler {
  condition: string
  evaluatorType: string
  event: string
  name: string
  actions: Action[]
  // Add other properties as needed
}

export interface EventExecution {
  id: string
  messageId: string
  created: number
  event: string
  name: string
  action: Action
  status: string
  output: { [key: string]: any }
  // Add other properties as needed
}

export interface MetadataService {
  getEventHandlersForEvent(event: string, flag: boolean): EventHandler[]
}

export interface ExecutionService {
  addMessage(queueName: string, msg: Message): void
  addEventExecution(eventExecution: EventExecution): boolean
  updateEventExecution(eventExecution: EventExecution): void
  removeEventExecution(eventExecution: EventExecution): void
}

export interface ActionProcessor {
  execute(
    action: Action,
    payloadObject: any,
    event: string,
    messageId: string
  ): Promise<{ [key: string]: any }>
}

export class DefaultEventProcessor {
  private static LOGGER: Logger = LoggerFactory.getLogger(DefaultEventProcessor)
  private metadataService: MetadataService
  private executionService: ExecutionService
  private actionProcessor: ActionProcessor
  private eventActionExecutorService: ExecutorService
  private objectMapper: ObjectMapper
  private jsonUtils: JsonUtils
  private isEventMessageIndexingEnabled: boolean
  private evaluators: Map<string, Evaluator>
  private retryTemplate: RetryTemplate

  constructor (
    executionService: ExecutionService,
    metadataService: MetadataService,
    actionProcessor: ActionProcessor,
    jsonUtils: JsonUtils,
    properties: ConductorProperties,
    objectMapper: ObjectMapper,
    evaluators: Map<string, Evaluator>,
    retryTemplate: RetryTemplate
  ) {
    this.executionService = executionService
    this.metadataService = metadataService
    this.actionProcessor = actionProcessor
    this.objectMapper = objectMapper
    this.jsonUtils = jsonUtils
    this.evaluators = evaluators
    this.retryTemplate = retryTemplate

    if (properties.getEventProcessorThreadCount() <= 0) {
      throw new Error(
        'Cannot set event processor thread count to <=0. To disable event processing, set conductor.default-event-processor.enabled=false.'
      )
    }

    const threadFactory = new BasicThreadFactory.Builder()
      .namingPattern('event-action-executor-thread-%d')
      .build()
    this.eventActionExecutorService = Executors.newFixedThreadPool(
      properties.getEventProcessorThreadCount(),
      threadFactory
    )

    this.isEventMessageIndexingEnabled =
      properties.isEventMessageIndexingEnabled()
    DefaultEventProcessor.LOGGER.info('Event Processing is ENABLED')
  }

  public async handle (queue: ObservableQueue, msg: Message): Promise<void> {
    let transientFailures: EventExecution[] | null = null
    let executionFailed = false

    try {
      if (this.isEventMessageIndexingEnabled) {
        this.executionService.addMessage(queue.getName(), msg)
      }

      const event = `${queue.getType()}:${queue.getName()}`
      DefaultEventProcessor.LOGGER.debug(
        'Evaluating message: {} for event: {}',
        msg.getId(),
        event
      )
      transientFailures = await this.executeEvent(event, msg)
    } catch (e) {
      executionFailed = true
      DefaultEventProcessor.LOGGER.error(
        'Error handling message: {} on queue: {}',
        msg,
        queue.getName(),
        e
      )
      Monitors.recordEventQueueMessagesError(queue.getType(), queue.getName())
    } finally {
      if (!executionFailed && transientFailures === null) {
        queue.ack([msg])
        DefaultEventProcessor.LOGGER.debug(
          'Message: {} acked on queue: {}',
          msg.getId(),
          queue.getName()
        )
      } else if (queue.rePublishIfNoAck() || transientFailures !== null) {
        queue.publish([msg])
        DefaultEventProcessor.LOGGER.debug(
          'Message: {} published to queue: {}',
          msg.getId(),
          queue.getName()
        )
      } else {
        queue.nack([msg])
        DefaultEventProcessor.LOGGER.debug(
          'Message: {} nacked on queue: {}',
          msg.getId(),
          queue.getName()
        )
      }

      Monitors.recordEventQueueMessagesHandled(queue.getType(), queue.getName())
    }
  }

  protected async executeEvent (
    event: string,
    msg: Message
  ): Promise<EventExecution[]> {
    let eventHandlerList: EventHandler[]
    const transientFailures: EventExecution[] = []

    try {
      eventHandlerList = this.metadataService.getEventHandlersForEvent(
        event,
        true
      )
    } catch (transientException) {
      transientFailures.push(new EventExecution(event, msg.getId()))
      return transientFailures
    }

    const payloadObject = this.getPayloadObject(msg.getPayload())

    for (const eventHandler of eventHandlerList) {
      const condition = eventHandler.condition
      const evaluatorType = eventHandler.evaluatorType
      let success = true

      if (condition && this.evaluators.get(evaluatorType)) {
        const result = this.evaluators
          .get(evaluatorType)
          .evaluate(condition, this.jsonUtils.expand(payloadObject))
        success = ScriptEvaluator.toBoolean(result)
      } else if (condition) {
        DefaultEventProcessor.LOGGER.debug(
          'Checking condition: {} for event: {}',
          condition,
          event
        )
        success = ScriptEvaluator.evalBool(
          condition,
          this.jsonUtils.expand(payloadObject)
        )
      }

      if (!success) {
        const id = `${msg.getId()}_0`
        const eventExecution: EventExecution = new EventExecution(
          id,
          msg.getId()
        )
        eventExecution.created = Date.now()
        eventExecution.event = eventHandler.event
        eventExecution.name = eventHandler.name
        eventExecution.status = Status.SKIPPED
        eventExecution.output.msg = msg.getPayload()
        eventExecution.output.condition = condition
        this.executionService.addEventExecution(eventExecution)
        DefaultEventProcessor.LOGGER.debug(
          'Condition: {} not successful for event: {} with payload: {}',
          condition,
          eventHandler.event,
          msg.getPayload()
        )
        continue
      }

      const futuresList: Promise<EventExecution>[] = []
      let i = 0

      for (const action of eventHandler.actions) {
        const id = `${msg.getId()}_${i++}`
        const eventExecution: EventExecution = new EventExecution(
          id,
          msg.getId()
        )
        eventExecution.created = Date.now()
        eventExecution.event = eventHandler.event
        eventExecution.name = eventHandler.name
        eventExecution.action = action
        eventExecution.status = Status.IN_PROGRESS

        if (this.executionService.addEventExecution(eventExecution)) {
          futuresList.push(
            new Promise(resolve =>
              this.execute(
                eventExecution,
                action,
                this.getPayloadObject(msg.getPayload())
              )
                .then(result => resolve(result))
                .catch(error => resolve(error))
            )
          )
        } else {
          DefaultEventProcessor.LOGGER.warn(
            'Duplicate delivery/execution of message: {}',
            msg.getId()
          )
        }
      }

      await Promise.all(
        futuresList.map(promise => promise.catch(error => error))
      )

      futuresList.forEach((eventExecution: EventExecution | Error) => {
        if (
          eventExecution instanceof Error ||
          eventExecution.status === Status.IN_PROGRESS
        ) {
          transientFailures.push(eventExecution)
        } else {
          this.executionService.updateEventExecution(eventExecution)
        }
      })
    }

    return this.processTransientFailures(transientFailures)
  }

  protected processTransientFailures (
    eventExecutions: EventExecution[]
  ): EventExecution[] {
    eventExecutions.forEach(eventExecution =>
      this.executionService.removeEventExecution(eventExecution)
    )
    return eventExecutions
  }

  protected async execute (
    eventExecution: EventExecution,
    action: Action,
    payload: any
  ): Promise<EventExecution> {
    try {
      DefaultEventProcessor.LOGGER.debug(
        'Executing action: {} for event: {} with messageId: {} with payload: {}',
        action.action,
        eventExecution.id,
        eventExecution.messageId,
        payload
      )

      const output = await this.retryTemplate.execute(async context =>
        this.actionProcessor.execute(
          action,
          payload,
          eventExecution.event,
          eventExecution.messageId
        )
      )

      if (output != null) {
        eventExecution.output = { ...eventExecution.output, ...output }
      }

      eventExecution.status = Status.COMPLETED
      Monitors.recordEventExecutionSuccess(
        eventExecution.event,
        eventExecution.name,
        eventExecution.action.action
      )
    } catch (e) {
      DefaultEventProcessor.LOGGER.error(
        'Error executing action: {} for event: {} with messageId: {}',
        action.action,
        eventExecution.event,
        eventExecution.messageId,
        e
      )

      if (!this.isTransientException(e)) {
        eventExecution.status = Status.FAILED
        eventExecution.output.exception = e.message
        Monitors.recordEventExecutionError(
          eventExecution.event,
          eventExecution.name,
          eventExecution.action.action,
          e.constructor.name
        )
      }
    }

    return eventExecution
  }

  private getPayloadObject (payload: string): any {
    let payloadObject = null

    if (payload != null) {
      try {
        payloadObject = this.objectMapper.readValue(payload, Object)
      } catch {
        payloadObject = payload
      }
    }

    return payloadObject
  }

  private isTransientException (error: Error): boolean {
    // Implement your logic to determine if the error is transient
    // Return true if it's a transient error, false otherwise
  }
}
