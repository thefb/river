export class ExecutionConfig {
    private executorService: ExecutorService;
    private semaphoreUtil: SemaphoreUtil;

    constructor(threadCount: number, threadNameFormat: string) {
        this.executorService = Executors.newFixedThreadPool(
            threadCount,
            new BasicThreadFactory.Builder().namingPattern(threadNameFormat).build()
        );
        this.semaphoreUtil = new SemaphoreUtil(threadCount);
    }

    getExecutorService(): ExecutorService {
        return this.executorService;
    }

    getSemaphoreUtil(): SemaphoreUtil {
        return this.semaphoreUtil;
    }
}
