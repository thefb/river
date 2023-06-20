export class BulkResponse {
    private bulkErrorResults: Map<string, string>;
    private bulkSuccessfulResults: string[];
    private message = "Bulk Request has been processed.";
  
    constructor() {
      this.bulkSuccessfulResults = [];
      this.bulkErrorResults = new Map<string, string>();
    }
  
    public getBulkSuccessfulResults(): string[] {
      return this.bulkSuccessfulResults;
    }
  
    public getBulkErrorResults(): Map<string, string> {
      return this.bulkErrorResults;
    }
  
    public appendSuccessResponse(id: string): void {
      this.bulkSuccessfulResults.push(id);
    }
  
    public appendFailedResponse(id: string, errorMessage: string): void {
      this.bulkErrorResults.set(id, errorMessage);
    }
  
    public equals(o: any): boolean {
      if (this === o) {
        return true;
      }
      if (!(o instanceof BulkResponse)) {
        return false;
      }
      const that: BulkResponse = o;
      return (
        JSON.stringify(this.bulkSuccessfulResults) ===
          JSON.stringify(that.bulkSuccessfulResults) &&
        JSON.stringify(this.bulkErrorResults) === JSON.stringify(that.bulkErrorResults)
      );
    }
  
    public hashCode(): number {
      return JSON.stringify(this.bulkSuccessfulResults).length + JSON.stringify(this.bulkErrorResults).length;
    }
  
    public toString(): string {
      return `BulkResponse{bulkSuccessfulResults=${JSON.stringify(
        this.bulkSuccessfulResults
      )}, bulkErrorResults=${JSON.stringify(this.bulkErrorResults)}, message='${this.message}'}`;
    }
  }
  