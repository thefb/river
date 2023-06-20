export class ConductorProperties {
  private stack = 'test'
  private appId = 'conductor'
  private executorServiceMaxThreadCount = 50
  private workflowOffsetTimeout: Duration = Duration.ofSeconds(30)
  private sweeperThreadCount: number =
    Runtime.getRuntime().availableProcessors() * 2
  private sweeperWorkflowPollTimeout: Duration = Duration.ofMillis(2000)
  private eventProcessorThreadCount = 2
  private eventMessageIndexingEnabled = true
  private eventExecutionIndexingEnabled = true
  private workflowExecutionLockEnabled = false
  private lockLeaseTime: Duration = Duration.ofMillis(60000)
  private lockTimeToTry: Duration = Duration.ofMillis(500)
  private activeWorkerLastPollTimeout: Duration = Duration.ofSeconds(10)
  private taskExecutionPostponeDuration: Duration = Duration.ofSeconds(60)
  private taskExecLogIndexingEnabled = true
  private asyncIndexingEnabled = false
  private systemTaskWorkerThreadCount: number =
    Runtime.getRuntime().availableProcessors() * 2
  private systemTaskWorkerCallbackDuration: Duration = Duration.ofSeconds(30)
  private systemTaskWorkerPollInterval: Duration = Duration.ofMillis(50)
  private systemTaskWorkerExecutionNamespace = ''
  private isolatedSystemTaskWorkerThreadCount = 1
  private asyncUpdateShortRunningWorkflowDuration: Duration =
    Duration.ofSeconds(30)
  private asyncUpdateDelay: Duration = Duration.ofSeconds(60)
  private ownerEmailMandatory = true
  private eventQueueSchedulerPollThreadCount: number =
    Runtime.getRuntime().availableProcessors()
  private eventQueuePollInterval: Duration = Duration.ofMillis(100)
  private eventQueuePollCount = 10
  private eventQueueLongPollTimeout: Duration = Duration.ofMillis(1000)
  private workflowInputPayloadSizeThreshold: DataSize =
    DataSize.ofKilobytes(5120)
  private maxWorkflowInputPayloadSizeThreshold: DataSize =
    DataSize.ofKilobytes(10240)
  private workflowOutputPayloadSizeThreshold: DataSize =
    DataSize.ofKilobytes(5120)
  private maxWorkflowOutputPayloadSizeThreshold: DataSize =
    DataSize.ofKilobytes(10240)
  private taskInputPayloadSizeThreshold: DataSize = DataSize.ofKilobytes(3072)
  private maxTaskInputPayloadSizeThreshold: DataSize =
    DataSize.ofKilobytes(10240)
  private taskOutputPayloadSizeThreshold: DataSize = DataSize.ofKilobytes(3072)
  private maxTaskOutputPayloadSizeThreshold: DataSize =
    DataSize.ofKilobytes(10240)
  private maxWorkflowVariablesPayloadSizeThreshold: DataSize =
    DataSize.ofKilobytes(256)
  private taskExecLogSizeLimit = 10

  public getAll (): Map<string, any> {
    const map: Map<string, any> = new Map<string, any>()
    const props: Properties = System.getProperties()
    props.forEach((key: string, value: any) => {
      map.set(key.toString(), value)
    })
    return map
  }
}
