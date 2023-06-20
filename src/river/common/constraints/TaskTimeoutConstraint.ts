import {
  validate,
  registerDecorator,
  ValidationOptions,
  ValidationArguments
} from 'class-validator'
import { TaskDef } from '../metadata/tasks/TaskDef'

// Define the custom constraint validator function
function isTaskTimeoutValid (value: any, args: ValidationArguments) {
  const taskDef = value as TaskDef

  if (
    taskDef.timeoutSeconds > 0 &&
    taskDef.responseTimeoutSeconds > taskDef.timeoutSeconds
  ) {
    return false
  }

  return true
}

// Register the custom constraint decorator
function TaskTimeoutConstraint (validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'taskTimeoutValid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate: isTaskTimeoutValid
      }
    })
  }
}

export { TaskTimeoutConstraint, isTaskTimeoutValid }
