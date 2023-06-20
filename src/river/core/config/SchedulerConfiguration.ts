import { ThreadFactory, Executors, Executor, Schedulers } from 'rxjs';

class SchedulerConfiguration implements SchedulingConfigurer {

  public static readonly SWEEPER_EXECUTOR_NAME: string = "WorkflowSweeperExecutor";

  public scheduler(properties: ConductorProperties): Scheduler {
    const threadFactory: ThreadFactory = Executors.defaultThreadFactory();
    const executorService: Executor = Executors.newFixedThreadPool(
      properties.getEventQueueSchedulerPollThreadCount(), threadFactory);

    return Schedulers.from(executorService);
  }

  public sweeperExecutor(properties: ConductorProperties): Executor {
    if (properties.getSweeperThreadCount() <= 0) {
      throw new Error("conductor.app.sweeper-thread-count must be greater than 0.");
    }
    const threadFactory: ThreadFactory = Executors.defaultThreadFactory();
    return Executors.newFixedThreadPool(properties.getSweeperThreadCount(), threadFactory);
  }

  public configureTasks(taskRegistrar: ScheduledTaskRegistrar): void {
    const threadPoolTaskScheduler: ThreadPoolTaskScheduler = new ThreadPoolTaskScheduler();
    threadPoolTaskScheduler.setPoolSize(3); // equal to the number of scheduled jobs
    threadPoolTaskScheduler.setThreadNamePrefix("scheduled-task-pool-");
    threadPoolTaskScheduler.initialize();
    taskRegistrar.setTaskScheduler(threadPoolTaskScheduler);
  }
}
