export interface EventQueueManager {
  getQueues(): Map<string, string>
  getQueueSizes(): Map<string, Map<string, number>>
}
