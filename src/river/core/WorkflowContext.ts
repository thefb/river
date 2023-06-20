class ThreadLocal<T> {
  private threadLocalMap: Map<number, T> = new Map<number, T>()
  private nextIndex = 0
  private initialValueFactory: () => T

  constructor (initialValueFactory: () => T) {
    this.initialValueFactory = initialValueFactory
  }

  public get (): T {
    const threadId = this.getThreadId()
    if (this.threadLocalMap.has(threadId)) {
      return this.threadLocalMap.get(threadId)!
    }
    return this.initialValue()
  }

  public set (value: T): void {
    const threadId = this.getThreadId()
    this.threadLocalMap.set(threadId, value)
  }

  public remove (): void {
    const threadId = this.getThreadId()
    this.threadLocalMap.delete(threadId)
  }

  private getThreadId (): number {
    if (!(self as any).threadLocalNextIndex) {
      (self as any).threadLocalNextIndex = 0
    }
    return (self as any).threadLocalNextIndex++
  }

  private initialValue (): T {
    return this.initialValueFactory()
  }
}

export class WorkflowContext {
  private static THREAD_LOCAL: ThreadLocal<WorkflowContext> =
    new ThreadLocal<WorkflowContext>(() => new WorkflowContext('', ''))

  private clientApp: string
  private userName: string | null

  constructor(clientApp: string)
  constructor(clientApp: string, userName: string)
  constructor (clientApp: string, userName?: string) {
    this.clientApp = clientApp
    this.userName = userName || null
  }

  public static get (): WorkflowContext {
    return WorkflowContext.THREAD_LOCAL.get()
  }

  public static set (ctx: WorkflowContext): void {
    WorkflowContext.THREAD_LOCAL.set(ctx)
  }

  public static unset (): void {
    WorkflowContext.THREAD_LOCAL.remove()
  }

  public getClientApp (): string {
    return this.clientApp
  }

  public getUserName (): string | null {
    return this.userName
  }
}
