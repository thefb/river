class PollData {
  queueName: string
  domain: string
  workerId: string
  lastPollTime: number

  constructor (
    queueName: string,
    domain: string,
    workerId: string,
    lastPollTime: number
  ) {
    this.queueName = queueName
    this.domain = domain
    this.workerId = workerId
    this.lastPollTime = lastPollTime
  }

  toString (): string {
    return `PollData { queueName='${this.queueName}', domain='${this.domain}', workerId='${this.workerId}', lastPollTime=${this.lastPollTime} }`
  }
}

export default PollData
