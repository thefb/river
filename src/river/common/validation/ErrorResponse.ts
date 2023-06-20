import { ValidationError } from "./ValidationError"

export class ErrorResponse {
  private status: number
  private code: string
  private message: string
  private instance: string
  private retryable: boolean
  private validationErrors: ValidationError[]
}
