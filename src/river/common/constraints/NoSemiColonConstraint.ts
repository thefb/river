// Custom decorator function for validating the absence of the ':' character
function NoSemiColonConstraint (target: any, propertyKey: string): void {
  const originalValidator = target.constructor.prototype.isValid

  // Override the isValid method of the validator
  target.constructor.prototype.isValid = function (value: string): boolean {
    const isValid = originalValidator.call(this, value)

    if (!isValid) {
      console.log(`Validation failed for ${propertyKey}`)
    }

    return isValid
  }
}

// Custom validator class
export class NoSemiColonValidator {
  isValid (value: string): boolean {
    return !value.includes(':')
  }
}
