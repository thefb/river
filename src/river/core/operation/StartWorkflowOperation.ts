import { Logger } from 'pino'
import { WorkflowDef } from '../../common/metadata/workflow/WorkflowDef'
import { WorkflowContext } from '../WorkflowContext'
import ExecutionDAOFacade from '../dal/ExecutionDAOFacade'
import WorkflowCreationEvent from '../event/WorkflowCreationEvent'
import WorkflowEvaluationEvent from '../event/WorkflowEvaluationEvent'
import { TransientException } from '../exception/TransientException'
import { StartWorkflowInput } from '../execution/StartWorkflowInput'
import { MetadataMapperService } from '../metadata/MetadataMapperService'
import { WorkflowModel } from '../model/WorkflowModel'

export class StartWorkflowOperation
  implements WorkflowOperation<StartWorkflowInput, string>
{
  private static readonly LOGGER: Logger = LoggerFactory.getLogger(
    StartWorkflowOperation
  )
  private readonly metadataMapperService: MetadataMapperService
  private readonly idGenerator: IDGenerator
  private readonly parametersUtils: ParametersUtils
  private readonly executionDAOFacade: ExecutionDAOFacade
  private readonly executionLockService: ExecutionLockService
  private readonly eventPublisher: ApplicationEventPublisher

  constructor (
    metadataMapperService: MetadataMapperService,
    idGenerator: IDGenerator,
    parametersUtils: ParametersUtils,
    executionDAOFacade: ExecutionDAOFacade,
    executionLockService: ExecutionLockService,
    eventPublisher: ApplicationEventPublisher
  ) {
    this.metadataMapperService = metadataMapperService
    this.idGenerator = idGenerator
    this.parametersUtils = parametersUtils
    this.executionDAOFacade = executionDAOFacade
    this.executionLockService = executionLockService
    this.eventPublisher = eventPublisher
  }

  execute (input: StartWorkflowInput): string {
    return this.startWorkflow(input)
  }

  handleWorkflowCreationEvent (
    workflowCreationEvent: WorkflowCreationEvent
  ): void {
    this.startWorkflow(workflowCreationEvent.getStartWorkflowInput())
  }

  private startWorkflow (input: StartWorkflowInput): string {
    let workflowDefinition: WorkflowDef

    if (input.getWorkflowDefinition() === null) {
      workflowDefinition =
        this.metadataMapperService.lookupForWorkflowDefinition(
          input.getName(),
          input.getVersion()
        )
    } else {
      workflowDefinition = input.getWorkflowDefinition()
    }

    workflowDefinition =
      this.metadataMapperService.populateTaskDefinitions(workflowDefinition)

    const workflowInput: Map<string, object> | null = input.getWorkflowInput()
    const externalInputPayloadStoragePath: string | null =
      input.getExternalInputPayloadStoragePath()
    this.validateWorkflow(
      workflowDefinition,
      workflowInput,
      externalInputPayloadStoragePath
    )

    const workflowId: string =
      input.getWorkflowId() ?? this.idGenerator.generate()

    const workflow: WorkflowModel = new WorkflowModel()
    workflow.setWorkflowId(workflowId)
    workflow.setCorrelationId(input.getCorrelationId())
    workflow.setPriority(input.getPriority() ?? 0)
    workflow.setWorkflowDefinition(workflowDefinition)
    workflow.setStatus(WorkflowModel.Status.RUNNING)
    workflow.setParentWorkflowId(input.getParentWorkflowId())
    workflow.setParentWorkflowTaskId(input.getParentWorkflowTaskId())
    workflow.setOwnerApp(WorkflowContext.get().getClientApp())
    workflow.setCreateTime(Date.now())
    workflow.setUpdatedBy(null)
    workflow.setUpdatedTime(null)
    workflow.setEvent(input.getEvent())
    workflow.setTaskToDomain(input.getTaskToDomain())
    workflow.setVariables(workflowDefinition.getVariables())

    if (workflowInput !== null && Object.keys(workflowInput).length > 0) {
      const parsedInput: Map<string, object> =
        this.parametersUtils.getWorkflowInput(workflowDefinition, workflowInput)
      workflow.setInput(parsedInput)
    } else {
      workflow.setExternalInputPayloadStoragePath(
        externalInputPayloadStoragePath
      )
    }

    try {
      this.createAndEvaluate(workflow)
      Monitors.recordWorkflowStartSuccess(
        workflow.getWorkflowName(),
        String(workflow.getWorkflowVersion()),
        workflow.getOwnerApp()
      )
      return workflowId
    } catch (e) {
      Monitors.recordWorkflowStartError(
        workflowDefinition.getName(),
        WorkflowContext.get().getClientApp()
      )
      StartWorkflowOperation.LOGGER.error(
        `Unable to start workflow: ${workflowDefinition.getName()}`,
        e
      )

      try {
        this.executionDAOFacade.removeWorkflow(workflowId, false)
      } catch (rwe) {
        StartWorkflowOperation.LOGGER.error(
          `Could not remove the workflowId: ${workflowId}`,
          rwe
        )
      }

      throw e
    }
  }

  private createAndEvaluate (workflow: WorkflowModel): void {
    if (!this.executionLockService.acquireLock(workflow.getWorkflowId())) {
      throw new TransientException(
        `Error acquiring lock when creating workflow: ${workflow.getWorkflowId()}`
      )
    }

    try {
      this.executionDAOFacade.createWorkflow(workflow)
      StartWorkflowOperation.LOGGER.debug(
        `A new instance of workflow: ${workflow.getWorkflowName()} created with id: ${workflow.getWorkflowId()}`
      )
      this.executionDAOFacade.populateWorkflowAndTaskPayloadData(workflow)
      this.eventPublisher.publishEvent(new WorkflowEvaluationEvent(workflow))
    } finally {
      this.executionLockService.releaseLock(workflow.getWorkflowId())
    }
  }

  private validateWorkflow (
    workflowDef: WorkflowDef,
    workflowInput: Map<string, object> | null,
    externalStoragePath: string | null
  ): void {
    if (workflowInput === null && StringUtils.isBlank(externalStoragePath)) {
      StartWorkflowOperation.LOGGER.error(
        `The input for the workflow '${workflowDef.getName()}' cannot be NULL`
      )
      Monitors.recordWorkflowStartError(
        workflowDef.getName(),
        WorkflowContext.get().getClientApp()
      )
      throw new IllegalArgumentException(
        'NULL input passed when starting workflow'
      )
    }
  }
}
