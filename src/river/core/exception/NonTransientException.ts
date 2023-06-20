export class NonTransientException extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NonTransientException';
    }
  }
  