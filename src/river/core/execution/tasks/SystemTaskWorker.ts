import { Logger, LoggerFactory, QueueDAO, ... } from '...'; // Import the required dependencies
import { LifecycleAwareComponent } from '../../LifecycleAwareComponent';
import { ConductorProperties } from '../../config/ConductorProperties';
import { ExecutionService } from '../../events/DefaultEventProcessor';
import { AsyncSystemTaskExecutor } from '../AsyncSystemTaskExecutor';
import { ExecutionConfig } from './ExecutionConfig';

class SystemTaskWorker extends LifecycleAwareComponent {
    private static readonly LOGGER: Logger = LoggerFactory.getLogger(SystemTaskWorker);

    private readonly pollInterval: number;
    private readonly queueDAO: QueueDAO;
    private defaultExecutionConfig: ExecutionConfig;
    private readonly asyncSystemTaskExecutor: AsyncSystemTaskExecutor;
    private readonly properties: ConductorProperties;
    private readonly executionService: ExecutionService;

    private queueExecutionConfigMap: Map<string, ExecutionConfig> = new Map();

    constructor(
        queueDAO: QueueDAO,
        asyncSystemTaskExecutor: AsyncSystemTaskExecutor,
        properties: ConductorProperties,
        executionService: ExecutionService
    ) {
        super();
        this.properties = properties;
        const threadCount = properties.getSystemTaskWorkerThreadCount();
        this.defaultExecutionConfig = new ExecutionConfig(threadCount, 'system-task-worker-%d');
        this.asyncSystemTaskExecutor = asyncSystemTaskExecutor;
        this.queueDAO = queueDAO;
        this.pollInterval = properties.getSystemTaskWorkerPollInterval().toMillis();
        this.executionService = executionService;

        SystemTaskWorker.LOGGER.info(`SystemTaskWorker initialized with ${threadCount} threads`);
    }

    public startPolling(systemTask: WorkflowSystemTask): void {
        this.startPolling(systemTask, systemTask.getTaskType());
    }

    public startPolling(systemTask: WorkflowSystemTask, queueName: string): void {
        setInterval(() => this.pollAndExecute(systemTask, queueName), this.pollInterval);
        SystemTaskWorker.LOGGER.info(`Started listening for task: ${systemTask} in queue: ${queueName}`);
    }

    private pollAndExecute(systemTask: WorkflowSystemTask, queueName: string): void {
        if (!this.isRunning()) {
            SystemTaskWorker.LOGGER.debug(`${this.constructor.name} stopped. Not polling for task: ${systemTask}`);
            return;
        }

        const executionConfig = this.getExecutionConfig(queueName);
        const semaphoreUtil = executionConfig.getSemaphoreUtil();
        const executorService = executionConfig.getExecutorService();
        const taskName = QueueUtils.getTaskType(queueName);

        const messagesToAcquire = semaphoreUtil.availableSlots();

        try {
            if (messagesToAcquire <= 0 || !semaphoreUtil.acquireSlots(messagesToAcquire)) {
                // no available slots, do not poll
                Monitors.recordSystemTaskWorkerPollingLimited(queueName);
                return;
            }

            SystemTaskWorker.LOGGER.debug(`Polling queue: ${queueName} with ${messagesToAcquire} slots acquired`);

            const polledTaskIds = queueDAO.pop(queueName, messagesToAcquire, 200);

            Monitors.recordTaskPoll(queueName);
            SystemTaskWorker.LOGGER.debug(`Polling queue: ${queueName}, got ${polledTaskIds.length} tasks`);

            if (polledTaskIds.length > 0) {
                // Immediately release unused slots when number of messages acquired is less than acquired slots
                if (polledTaskIds.length < messagesToAcquire) {
                    semaphoreUtil.completeProcessing(messagesToAcquire - polledTaskIds.length);
                }

                for (const taskId of polledTaskIds) {
                    if (taskId !== '') {
                        SystemTaskWorker.LOGGER.debug(`Task: ${taskId} from queue: ${queueName} being sent to the workflow executor`);
                        Monitors.recordTaskPollCount(queueName, 1);

                        executionService.ackTaskReceived(taskId);

                        const taskCompletableFuture = CompletableFuture.runAsync(
                            () => asyncSystemTaskExecutor.execute(systemTask, taskId),
                            executorService
                        );

                        // release permit after processing is complete
                        taskCompletableFuture.whenComplete((r, e) => semaphoreUtil.completeProcessing(1));
                    } else {
                        semaphoreUtil.completeProcessing(1);
                    }
                }
            } else {
                // no task polled, release permit
                semaphoreUtil.completeProcessing(messagesToAcquire);
            }
        } catch (e) {
            // release the permit if exception is thrown during polling, because the thread would not be busy
            semaphoreUtil.completeProcessing(messagesToAcquire);
            Monitors.recordTaskPollError(taskName, e.constructor.name);
            SystemTaskWorker.LOGGER.error(`Error polling system task in queue: ${queueName}`, e);
        }
    }

    private getExecutionConfig(taskQueue: string): ExecutionConfig {
        if (!QueueUtils.isIsolatedQueue(taskQueue)) {
            return this.defaultExecutionConfig;
        }
        let executionConfig = this.queueExecutionConfigMap.get(taskQueue);
        if (!executionConfig) {
            executionConfig = this.createExecutionConfig();
            this.queueExecutionConfigMap.set(taskQueue, executionConfig);
        }
        return executionConfig;
    }

    private createExecutionConfig(): ExecutionConfig {
        const threadCount = this.properties.getIsolatedSystemTaskWorkerThreadCount();
        const threadNameFormat = 'isolated-system-task-worker-%d';
        return new ExecutionConfig(threadCount, threadNameFormat);
    }
}
