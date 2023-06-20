export class SystemTaskWorkerCoordinator {
    private static readonly LOGGER: Logger = LoggerFactory.getLogger(SystemTaskWorkerCoordinator);

    private readonly systemTaskWorker: SystemTaskWorker;
    private readonly executionNameSpace: string;
    private readonly asyncSystemTasks: Set<WorkflowSystemTask>;

    constructor(
        systemTaskWorker: SystemTaskWorker,
        properties: ConductorProperties,
        asyncSystemTasks: Set<WorkflowSystemTask>
    ) {
        this.systemTaskWorker = systemTaskWorker;
        this.asyncSystemTasks = asyncSystemTasks;
        this.executionNameSpace = properties.getSystemTaskWorkerExecutionNamespace();
    }

    public initSystemTaskExecutor(): void {
        for (const systemTask of this.asyncSystemTasks) {
            if (this.isFromCoordinatorExecutionNameSpace(systemTask)) {
                this.systemTaskWorker.startPolling(systemTask);
            }
        }
        SystemTaskWorkerCoordinator.LOGGER.info(
            `${SystemTaskWorkerCoordinator.name} initialized with ${this.asyncSystemTasks.size} async tasks`
        );
    }

    private isFromCoordinatorExecutionNameSpace(systemTask: WorkflowSystemTask): boolean {
        const queueExecutionNameSpace = QueueUtils.getExecutionNameSpace(systemTask.getTaskType());
        return queueExecutionNameSpace === this.executionNameSpace;
    }
}
