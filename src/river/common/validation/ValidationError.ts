export class ValidationError {
  path: string
  message: string
  invalidValue: string

  constructor (path: string, message: string, invalidValue: string) {
    this.path = path
    this.message = message
    this.invalidValue = invalidValue
  }

  toString (): string {
    return `ValidationError[path='${this.path}', message='${this.message}', invalidValue='${this.invalidValue}']`
  }
}
