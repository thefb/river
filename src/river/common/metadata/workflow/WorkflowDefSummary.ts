import { hashCode } from "../../../utils"

export interface Comparable<T> {
  compareTo(other: T): number
}

export class WorkflowDefSummary implements Comparable<WorkflowDefSummary> {
  name: string
  version = 1
  createTime?: number

  equals (o: any): boolean {
    if (this === o) {
      return true
    }
    if (o === null || this.constructor !== o.constructor) {
      return false
    }
    const that: WorkflowDefSummary = o as WorkflowDefSummary
    return (
        this.version === that.version &&
        this.name === that.name
    )
  }

  setName (name: string): void {
    this.name = name
  }

  setVersion (version: number): void {
    this.version = version
  }

  setCreateTime (createTime: number): void {
    this.createTime = createTime
  }

  hashCode(): number {
    return hashCode(this.name) ^ this.version;
  }

  toString (): string {
    return `WorkflowDef{name='${this.name}', version=${this.version}}`
  }

  compareTo (other: WorkflowDefSummary): number {
    let res: number = this.name.localeCompare(other.name)
    if (res !== 0) {
      return res
    }
    res = this.version - other.version
    return res
  }
}
