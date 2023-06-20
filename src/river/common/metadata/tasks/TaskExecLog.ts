export class TaskExecLog {
    log: string;
    taskId: string;
    createdTime: number;
  
    constructor(log: string) {
      this.log = log;
      this.createdTime = Date.now();
    }
  
    equals(o: any): boolean {
      if (this === o) {
        return true;
      }
      if (o === null || this.constructor !== o.constructor) {
        return false;
      }
      const that = o as TaskExecLog;
      return (
        this.createdTime === that.createdTime &&
        this.log === that.log &&
        this.taskId === that.taskId
      );
    }
  
    hashCode(): number {
        let hash = 0;
        for (let i = 0; i < this.log.length; i++) {
          hash = (hash << 5) - hash + this.log.charCodeAt(i);
          hash |= 0; // Convert to 32-bit integer
        }
        hash = hash ^ this.taskId.length;
        hash = hash ^ this.createdTime;
        return hash;
      }
  }
  