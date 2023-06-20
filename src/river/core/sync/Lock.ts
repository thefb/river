export enum LockMode {
  Exclusive = 'Exclusive',
  Shared = 'Shared',
}

export interface Lock {
  mode: LockMode;
  name: string;
  acquireLockIndefinite(lockId: string): Promise<void>;
  acquireLockWithTimeout(lockId: string, timeToTry: number): Promise<boolean>;
  acquireLockWithLeaseTime(
    lockId: string,
    timeToTry: number,
    leaseTime: number
  ): Promise<boolean>;
  releaseLock(lockId: string): void;
  deleteLock(lockId: string): void;
}