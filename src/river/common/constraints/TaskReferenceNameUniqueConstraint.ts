import { validate, registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { WorkflowDef } from '../metadata/workflow/WorkflowDef';

// Define the custom constraint validator function
function isTaskReferenceNameUnique(value: any, args: ValidationArguments) {
  const workflowDef = value as WorkflowDef;

  const taskReferenceMap = new Map<string, number>();

  for (const task of workflowDef.tasks) {
    if (taskReferenceMap.has(task.taskReferenceName)) {
      return false;
    } else {
      taskReferenceMap.set(task.taskReferenceName, 1);
    }
  }

  return true;
}

// Register the custom constraint decorator
function TaskReferenceNameUniqueConstraint(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'taskReferenceNameUnique',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate: isTaskReferenceNameUnique,
      },
    });
  };
}