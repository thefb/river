export interface EventQueueProvider {
    getQueueType(): string;
    getQueue(queueURI: string): ObservableQueue;
  }
  