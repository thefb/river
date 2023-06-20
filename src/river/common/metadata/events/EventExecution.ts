enum Status {
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    SKIPPED = "SKIPPED",
  }
  
  interface Action {
    type: string;
  }
  
  class EventExecution {
    id: string;
    messageId: string;
    name: string;
    event: string;
    created: number;
    status: Status;
    action: Action["type"];
    output: Record<string, any>;
  
    constructor(id: string, messageId: string) {
      this.id = id;
      this.messageId = messageId;
      this.output = {};
    }
  }
  
  export { EventExecution, Status };
  