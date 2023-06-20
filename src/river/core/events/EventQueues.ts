import { Logger, LoggerFactory } from 'your-logging-library'; // Replace with your actual logging library
import { EventQueueProvider } from './EventQueueProvider';

export class EventQueues {
  private static readonly EVENT_QUEUE_PROVIDERS_QUALIFIER = 'EventQueueProviders';
  private static readonly LOGGER: Logger = LoggerFactory.getLogger(EventQueues);

  private readonly parametersUtils: ParametersUtils;
  private readonly providers: Map<string, EventQueueProvider>;

  constructor(providers: Map<string, EventQueueProvider>, parametersUtils: ParametersUtils) {
    this.providers = providers;
    this.parametersUtils = parametersUtils;
  }

  getProviders(): string[] {
    return Array.from(this.providers.values()).map((p) => p.constructor.name);
  }

  getQueue(eventType: string): ObservableQueue {
    const event = this.parametersUtils.replace(eventType).toString();
    const index = event.indexOf(':');
    if (index === -1) {
      throw new Error('Illegal event ' + event);
    }

    const type = event.substring(0, index);
    const queueURI = event.substring(index + 1);
    const provider = this.providers.get(type);
    if (provider) {
      return provider.getQueue(queueURI);
    } else {
      throw new Error('Unknown queue type ' + type);
    }
  }
}
