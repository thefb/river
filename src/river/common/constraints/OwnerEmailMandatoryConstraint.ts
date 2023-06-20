// Custom decorator function for validating the presence of ownerEmail
function OwnerEmailMandatoryConstraint (target: any, propertyKey: string): void {
  const originalValidator = target.constructor.prototype.isValid

  // Override the isValid method of the validator
  target.constructor.prototype.isValid = function (
    ownerEmail: string
  ): boolean {
    const isValid = originalValidator.call(this, ownerEmail)

    if (!isValid) {
      console.log(`Validation failed for ${propertyKey}`)
    }

    return isValid
  }
}

// Custom validator class
class WorkflowTaskValidValidator {
  isValid (ownerEmail: string): boolean {
    return (
      !WorkflowTaskValidValidator.ownerEmailMandatory ||
      (ownerEmail !== undefined && ownerEmail.trim().length > 0)
    )
  }

  private static ownerEmailMandatory = true

  static setOwnerEmailMandatory (ownerEmailMandatory: boolean): void {
    WorkflowTaskValidValidator.ownerEmailMandatory = ownerEmailMandatory
  }
}

export { WorkflowTaskValidValidator, OwnerEmailMandatoryConstraint }
