export class LocalOnlyLock implements Lock {
  mode: LockMode
  name: string
  private locks: Map<string, (resolve: void) => void> = new Map()

  constructor (mode: LockMode, name: string) {
    this.mode = mode
    this.name = name
  }

  acquireLockIndefinite (lockId: string): Promise<void> {
    console.log(`Locking ${lockId}`)
    return new Promise<void>(resolve => {
      this.locks.set(lockId, resolve)
    })
  }

  async acquireLockWithTimeout (
    lockId: string,
    timeToTry: number
  ): Promise<boolean> {
    console.log(`Locking ${lockId} with timeout ${timeToTry}`)
    const lockPromise = this.acquireLockIndefinite(lockId)
    try {
      await Promise.race([
        lockPromise,
        new Promise<void>((_, reject) =>
          setTimeout(
            () => reject(new Error('Lock acquisition timeout')),
            timeToTry
          )
        )
      ])
      return true
    } catch (error) {
      console.error(error)
      return false
    }
  }

  async acquireLockWithLeaseTime (
    lockId: string,
    timeToTry: number,
    leaseTime: number
  ): Promise<boolean> {
    console.log(
      `Locking ${lockId} with timeout ${timeToTry} and lease time ${leaseTime}`
    )
    const lockAcquired = await this.acquireLockWithTimeout(lockId, timeToTry)
    if (lockAcquired) {
      console.log(`Releasing ${lockId} automatically after ${leaseTime}`)
      setTimeout(() => this.releaseLock(lockId), leaseTime)
    }
    return lockAcquired
  }

  releaseLock (lockId: string): void {
    console.log(`Releasing ${lockId}`)
    const resolve = this.locks.get(lockId)
    if (resolve) {
      this.locks.delete(lockId)
      resolve()
    }
  }

  deleteLock (lockId: string): void {
    console.log(`Deleting ${lockId}`)
    this.locks.delete(lockId)
  }
}
