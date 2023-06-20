export class TransientException extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'TransientException';
    }
  }