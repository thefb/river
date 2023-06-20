import { isEqual } from 'lodash'
import { BaseDef } from '../BaseDef'
import { hash } from '../../../utils'

enum TimeoutPolicy {
  RETRY,
  TIME_OUT_WF,
  ALERT_ONLY
}

enum RetryLogic {
  FIXED,
  EXPONENTIAL_BACKOFF,
  LINEAR_BACKOFF
}

export class TaskDef extends BaseDef {
  public static readonly ONE_HOUR: number = 60 * 60

  public name: string
  public description: string
  public retryCount = 3 // Default
  public timeoutSeconds: number
  public inputKeys: string[] = []
  public outputKeys: string[] = []
  public timeoutPolicy: TimeoutPolicy = TimeoutPolicy.TIME_OUT_WF
  public retryLogic: RetryLogic = RetryLogic.FIXED
  public retryDelaySeconds = 60
  public responseTimeoutSeconds: number = TaskDef.ONE_HOUR
  public concurrentExecLimit: number | null = null
  public inputTemplate: Record<string, unknown> = {}
  public rateLimitPerFrequency: number | null = null
  public rateLimitFrequencyInSeconds: number | null = null
  public isolationGroupId: string | null = null
  public executionNameSpace: string | null = null
  public ownerEmail: string | null = null
  public pollTimeoutSeconds: number | null = null
  public backoffScaleFactor = 1

  constructor (
    name: string,
    description?: string,
    ownerEmail?: string,
    retryCount?: number,
    timeoutSeconds?: number,
    responseTimeoutSeconds?: number
  ) {
    super()
    this.name = name
    this.description = description || ''
    this.ownerEmail = ownerEmail || null
    this.retryCount = retryCount !== undefined ? retryCount : this.retryCount
    this.timeoutSeconds =
      timeoutSeconds !== undefined ? timeoutSeconds : this.timeoutSeconds
    this.responseTimeoutSeconds =
      responseTimeoutSeconds !== undefined
        ? responseTimeoutSeconds
        : this.responseTimeoutSeconds
  }

  public getRateLimitPerFrequency (): number {
    return this.rateLimitPerFrequency ?? 0
  }

  public getRateLimitFrequencyInSeconds (): number {
    return this.rateLimitFrequencyInSeconds ?? 1
  }

  public concurrencyLimit (): number {
    return this.concurrentExecLimit ?? 0
  }

  public toString (): string {
    return this.name
  }

  public equals(o: object): boolean {
    if (this === o) {
      return true;
    }
    if (o == null || this.constructor !== o.constructor) {
      return false;
    }
    const taskDef: TaskDef = o as TaskDef;
    return (
      this.retryCount === taskDef.retryCount &&
      this.timeoutSeconds === taskDef.timeoutSeconds &&
      this.retryDelaySeconds === taskDef.retryDelaySeconds &&
      this.backoffScaleFactor === taskDef.backoffScaleFactor &&
      this.responseTimeoutSeconds === taskDef.responseTimeoutSeconds &&
      this.name === taskDef.name &&
      this.description === taskDef.description &&
      isEqual(this.inputKeys, taskDef.inputKeys) &&
      isEqual(this.outputKeys, taskDef.outputKeys) &&
      this.timeoutPolicy === taskDef.timeoutPolicy &&
      this.retryLogic === taskDef.retryLogic &&
      this.concurrentExecLimit === taskDef.concurrentExecLimit &&
      this.rateLimitPerFrequency === taskDef.rateLimitPerFrequency &&
      isEqual(this.inputTemplate, taskDef.inputTemplate) &&
      this.isolationGroupId === taskDef.isolationGroupId &&
      this.executionNameSpace === taskDef.executionNameSpace &&
      this.ownerEmail === taskDef.ownerEmail
    );
  }

  public hashCode (): number {
    return hash(
      this.name,
      this.description,
      this.retryCount,
      this.timeoutSeconds,
      this.inputKeys,
      this.outputKeys,
      this.timeoutPolicy,
      this.retryLogic,
      this.retryDelaySeconds,
      this.backoffScaleFactor,
      this.responseTimeoutSeconds,
      this.concurrentExecLimit,
      this.rateLimitPerFrequency,
      this.inputTemplate,
      this.isolationGroupId,
      this.executionNameSpace,
      this.ownerEmail
    )
  }
}
