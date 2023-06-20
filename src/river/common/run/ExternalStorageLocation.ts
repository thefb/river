export class ExternalStorageLocation {
  private uri: string
  private path: string
  toString (): string {
    return `ExternalStorageLocation{ uri='${this.uri}', path='${this.path}' }`
  }
}
