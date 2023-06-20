import { WorkflowSweeper } from './WorkflowSweeper';
import { QueueDAO } from './QueueDAO';
import { ConductorProperties } from './ConductorProperties';

export class WorkflowReconciler extends LifecycleAwareComponent {
  private readonly workflowSweeper: WorkflowSweeper;
  private readonly queueDAO: QueueDAO;
  private readonly sweeperThreadCount: number;
  private readonly sweeperWorkflowPollTimeout: number;

  private static readonly LOGGER = LoggerFactory.getLogger(WorkflowReconciler);

  constructor(
    workflowSweeper: WorkflowSweeper,
    queueDAO: QueueDAO,
    properties: ConductorProperties
  ) {
    super();
    this.workflowSweeper = workflowSweeper;
    this.queueDAO = queueDAO;
    this.sweeperThreadCount = properties.getSweeperThreadCount();
    this.sweeperWorkflowPollTimeout = properties.getSweeperWorkflowPollTimeout().toMillis();
    LOGGER.info(
      `WorkflowReconciler initialized with ${properties.getSweeperThreadCount()} sweeper threads`
    );
  }

  public pollAndSweep(): void {
    try {
      if (!this.isRunning()) {
        LOGGER.debug('Component stopped, skip workflow sweep');
      } else {
        const workflowIds = this.queueDAO.pop(
          DECIDER_QUEUE,
          this.sweeperThreadCount,
          this.sweeperWorkflowPollTimeout
        );
        if (workflowIds != null) {
          Promise.all(workflowIds.map((workflowId) => this.workflowSweeper.sweepAsync(workflowId)))
            .then(() => {
              LOGGER.debug(
                `Sweeper processed ${workflowIds.join(',')} from the decider queue`
              );
            })
            .catch((error) => {
              Monitors.error(WorkflowReconciler.name, 'poll');
              LOGGER.error('Error when sweeping workflows', error);
              if (error instanceof InterruptedException) {
                // Restore interrupted state...
                Thread.currentThread().interrupt();
              }
            });
        }
        // NOTE: Disabling the sweeper implicitly disables this metric.
        this.recordQueueDepth();
      }
    } catch (error) {
      Monitors.error(WorkflowReconciler.name, 'poll');
      LOGGER.error('Error when polling for workflows', error);
      if (error instanceof InterruptedException) {
        // Restore interrupted state...
        Thread.currentThread().interrupt();
      }
    }
  }

  private recordQueueDepth(): void {
    const currentQueueSize = this.queueDAO.getSize(DECIDER_QUEUE);
    Monitors.recordGauge(DECIDER_QUEUE, currentQueueSize);
  }
}
