import { LockMode } from '../Lock'

class NoopLock implements Lock {
  mode: LockMode
  name: string

  constructor () {
    this.mode = LockMode.MODE_1 // Replace with the desired lock mode
    this.name = 'NoopLock' // Replace with the desired lock name
  }

  async acquireLockIndefinite (lockId: string): Promise<void> {}

  async acquireLockWithTimeout (
    lockId: string,
    timeToTry: number
  ): Promise<boolean> {
    return true
  }

  async acquireLockWithLeaseTime (
    lockId: string,
    timeToTry: number,
    leaseTime: number
  ): Promise<boolean> {
    return true
  }

  releaseLock (lockId: string): void {}

  deleteLock (lockId: string): void {}
}

export default NoopLock
