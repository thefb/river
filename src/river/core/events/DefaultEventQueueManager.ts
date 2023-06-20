import { Logger, LoggerFactory } from 'your-logging-library' // Replace with your actual logging library

interface ObservableQueue {
  getName(): string
  size(): number
  start(): void
  stop(): void
  observe(): Observable<Message> // Replace with the appropriate Observable type
}

interface EventHandlerDAO {
  getAllEventHandlers(): EventHandler[]
}

interface EventQueues {
  getQueue(event: string): ObservableQueue
}

interface EventHandler {
  isActive(): boolean
  getEvent(): string
}

enum Status {}
// Define your status enum values here

interface Message {
  // Define your message interface here
}

class DefaultEventProcessor {
  handle (queue: ObservableQueue, msg: Message): void {
    // Handle the message
  }
}

class DefaultEventQueueManager
  extends LifecycleAwareComponent
  implements EventQueueManager
{
  private static readonly LOGGER: Logger = LoggerFactory.getLogger(
    DefaultEventQueueManager
  )

  private readonly eventHandlerDAO: EventHandlerDAO
  private readonly eventQueues: EventQueues
  private readonly defaultEventProcessor: DefaultEventProcessor
  private readonly eventToQueueMap: Map<string, ObservableQueue> = new Map()
  private readonly defaultQueues: Map<Status, ObservableQueue>

  constructor (
    defaultQueues: Map<Status, ObservableQueue>,
    eventHandlerDAO: EventHandlerDAO,
    eventQueues: EventQueues,
    defaultEventProcessor: DefaultEventProcessor
  ) {
    super()
    this.defaultQueues = defaultQueues
    this.eventHandlerDAO = eventHandlerDAO
    this.eventQueues = eventQueues
    this.defaultEventProcessor = defaultEventProcessor
  }

  /**
   * @return Returns a map of queues which are active. Key is event name and value is queue URI
   */
  getQueues (): Map<string, string> {
    const queues: Map<string, string> = new Map()
    this.eventToQueueMap.forEach((value, key) =>
      queues.set(key, value.getName())
    )
    return queues
  }

  getQueueSizes (): Map<string, Map<string, number>> {
    const queues: Map<string, Map<string, number>> = new Map()
    this.eventToQueueMap.forEach((value, key) => {
      const size: Map<string, number> = new Map()
      size.set(value.getName(), value.size())
      queues.set(key, size)
    })
    return queues
  }

  doStart (): void {
    this.eventToQueueMap.forEach((queue, event) => {
      DefaultEventQueueManager.LOGGER.info(
        'Start listening for events: ' + event
      )
      queue.start()
    })
    this.defaultQueues.forEach((queue, status) => {
      DefaultEventQueueManager.LOGGER.info(
        'Start listening on default queue ' +
          queue.getName() +
          ' for status ' +
          status
      )
      queue.start()
    })
  }

  doStop (): void {
    this.eventToQueueMap.forEach((queue, event) => {
      DefaultEventQueueManager.LOGGER.info(
        'Stop listening for events: ' + event
      )
      queue.stop()
    })
    this.defaultQueues.forEach((queue, status) => {
      DefaultEventQueueManager.LOGGER.info(
        'Stop listening on default queue ' +
          queue.getName() +
          ' for status ' +
          status
      )
      queue.stop()
    })
  }

  refreshEventQueues (): void {
    try {
      const events = this.eventHandlerDAO
        .getAllEventHandlers()
        .filter(handler => handler.isActive())
        .map(handler => handler.getEvent())

      const createdQueues: ObservableQueue[] = []
      events.forEach(event => {
        const queue =
          this.eventToQueueMap.get(event) ||
          (() => {
            const q = this.eventQueues.getQueue(event)
            createdQueues.push(q)
            return q
          })()
        this.eventToQueueMap.set(event, queue)
      })

      createdQueues
        .filter(queue => queue !== null)
        .forEach(queue => {
          queue.start()
          this.listen(queue)
        })

      const removed: string[] = Array.from(this.eventToQueueMap.keys()).filter(
        key => !events.includes(key)
      )

      removed.forEach(key => {
        const queue = this.eventToQueueMap.get(key)
        if (queue) {
          try {
            queue.stop()
          } catch (e) {
            DefaultEventQueueManager.LOGGER.error(
              'Failed to stop queue: ' + queue,
              e
            )
          }
        }
        this.eventToQueueMap.delete(key)
      })

      DefaultEventQueueManager.LOGGER.debug(
        'Event queues: ' + Array.from(this.eventToQueueMap.keys())
      )
      DefaultEventQueueManager.LOGGER.debug('Stored queue: ' + events)
      DefaultEventQueueManager.LOGGER.debug('Removed queue: ' + removed)
    } catch (e) {
      Monitors.error(this.constructor.name, 'refresh')
      DefaultEventQueueManager.LOGGER.error('refresh event queues failed', e)
    }
  }

  private listen (queue: ObservableQueue): void {
    queue
      .observe()
      .subscribe((msg: Message) =>
        this.defaultEventProcessor.handle(queue, msg)
      )
  }
}
