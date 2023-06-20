import { ConductorProperties } from './ConductorProperties';
import { WorkflowExecutor } from './WorkflowExecutor';
import { WorkflowRepairService } from './WorkflowRepairService';
import { QueueDAO } from './QueueDAO';

export class WorkflowSweeper {
  private static readonly LOGGER = LoggerFactory.getLogger(WorkflowSweeper);
  private readonly properties: ConductorProperties;
  private readonly workflowExecutor: WorkflowExecutor;
  private readonly workflowRepairService: WorkflowRepairService | null;
  private readonly queueDAO: QueueDAO;

  private static readonly CLASS_NAME = WorkflowSweeper.class.getSimpleName();

  constructor(
    workflowExecutor: WorkflowExecutor,
    workflowRepairService: Optional<WorkflowRepairService>,
    properties: ConductorProperties,
    queueDAO: QueueDAO
  ) {
    this.properties = properties;
    this.queueDAO = queueDAO;
    this.workflowExecutor = workflowExecutor;
    this.workflowRepairService = workflowRepairService.orElse(null);
    LOGGER.info('WorkflowSweeper initialized.');
  }

  public async sweepAsync(workflowId: string): Promise<void> {
    this.sweep(workflowId);
    return Promise.resolve();
  }

  public sweep(workflowId: string): void {
    let workflow: WorkflowModel | null = null;
    try {
      const workflowContext = new WorkflowContext(properties.getAppId());
      WorkflowContext.set(workflowContext);
      LOGGER.debug(`Running sweeper for workflow ${workflowId}`);

      if (this.workflowRepairService !== null) {
        // Verify and repair tasks in the workflow.
        this.workflowRepairService.verifyAndRepairWorkflowTasks(workflowId);
      }

      workflow = this.workflowExecutor.decide(workflowId);
      if (workflow !== null && workflow.getStatus().isTerminal()) {
        this.queueDAO.remove(DECIDER_QUEUE, workflowId);
        return;
      }
    } catch (nfe) {
      this.queueDAO.remove(DECIDER_QUEUE, workflowId);
      LOGGER.info(`Workflow NOT found for id:${workflowId}. Removed it from decider queue`, nfe);
      return;
    } catch (e) {
      Monitors.error(CLASS_NAME, 'sweep');
      LOGGER.error(`Error running sweep for ${workflowId}`, e);
    }
    const workflowOffsetTimeout = this.workflowOffsetWithJitter(properties.getWorkflowOffsetTimeout().getSeconds());
    if (workflow !== null) {
      const startTime = Instant.now().toEpochMilli();
      this.unack(workflow, workflowOffsetTimeout);
      const endTime = Instant.now().toEpochMilli();
      Monitors.recordUnackTime(workflow.getWorkflowName(), endTime - startTime);
    } else {
      LOGGER.warn(`Workflow with ${workflowId} id can not be found. Attempting to unack using the id`);
      this.queueDAO.setUnackTimeout(DECIDER_QUEUE, workflowId, workflowOffsetTimeout * 1000);
    }
  }

  private unack(workflowModel: WorkflowModel, workflowOffsetTimeout: number): void {
    let postponeDurationSeconds = 0;
    for (const taskModel of workflowModel.getTasks()) {
      if (taskModel.getStatus() === Status.IN_PROGRESS) {
        if (taskModel.getTaskType() === TaskType.TASK_TYPE_WAIT) {
          if (taskModel.getWaitTimeout() === 0) {
            postponeDurationSeconds = workflowOffsetTimeout;
          } else {
            const deltaInSeconds = (taskModel.getWaitTimeout() - System.currentTimeMillis()) / 1000;
            postponeDurationSeconds = deltaInSeconds > 0 ? deltaInSeconds : 0;
          }
        } else if (taskModel.getTaskType() === TaskType.TASK_TYPE_HUMAN) {
          postponeDurationSeconds = workflowOffsetTimeout;
        } else {
          postponeDurationSeconds = taskModel.getResponseTimeoutSeconds() !== 0
            ? taskModel.getResponseTimeoutSeconds() + 1
            : workflowOffsetTimeout;
        }
        break;
      } else if (taskModel.getStatus() === Status.SCHEDULED) {
        const taskDefinition = taskModel.getTaskDefinition();
        if (taskDefinition.isPresent()) {
          const taskDef = taskDefinition.get();
          if (taskDef.getPollTimeoutSeconds() !== null && taskDef.getPollTimeoutSeconds() !== 0) {
            postponeDurationSeconds = taskDef.getPollTimeoutSeconds() + 1;
          } else {
            postponeDurationSeconds = workflowModel.getWorkflowDefinition().getTimeoutSeconds() !== 0
              ? workflowModel.getWorkflowDefinition().getTimeoutSeconds() + 1
              : workflowOffsetTimeout;
          }
        } else {
          postponeDurationSeconds = workflowModel.getWorkflowDefinition().getTimeoutSeconds() !== 0
            ? workflowModel.getWorkflowDefinition().getTimeoutSeconds() + 1
            : workflowOffsetTimeout;
        }
        break;
      }
    }
    this.queueDAO.setUnackTimeout(DECIDER_QUEUE, workflowModel.getWorkflowId(), postponeDurationSeconds * 1000);
  }

  private workflowOffsetWithJitter(workflowOffsetTimeout: number): number {
    const range = workflowOffsetTimeout / 3;
    const jitter = new Random().nextInt((2 * range + 1)) - range;
    return workflowOffsetTimeout + jitter;
  }
}
