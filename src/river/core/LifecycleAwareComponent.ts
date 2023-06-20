import pino, { Logger } from 'pino';

export abstract class LifecycleAwareComponent implements SmartLifecycle {
  private running: boolean = false;
  private static logger: Logger;

  constructor(loggerOptions?: pino.LoggerOptions) {
    LifecycleAwareComponent.logger = pino(loggerOptions);
  }

  public start(): void {
    this.running = true;
    LifecycleAwareComponent.logger.info(`${this.constructor.name} started.`);
    this.doStart();
  }

  public stop(): void {
    this.running = false;
    LifecycleAwareComponent.logger.info(`${this.constructor.name} stopped.`);
    this.doStop();
  }

  public isRunning(): boolean {
    return this.running;
  }

  protected doStart(): void {}

  protected doStop(): void {}
}

interface SmartLifecycle {
  start(): void;
  stop(): void;
  isRunning(): boolean;
}
