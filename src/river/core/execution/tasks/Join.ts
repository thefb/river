import { WorkflowModel, TaskModel, WorkflowExecutor } from '...'; // Import the required dependencies

class Join extends WorkflowSystemTask {
    constructor() {
        super(TASK_TYPE_JOIN);
    }

    execute(workflow: WorkflowModel, task: TaskModel, workflowExecutor: WorkflowExecutor): boolean {
        let allDone = true;
        let hasFailures = false;
        const failureReason = new StringBuilder();
        const optionalTaskFailures = new StringBuilder();
        const joinOn = task.getInputData().joinOn as string[];

        if (task.isLoopOverTask()) {
            // If join is part of loop over task, wait for specific iteration to get complete
            joinOn = joinOn.map((name) => TaskUtils.appendIteration(name, task.getIteration()));
        }

        for (const joinOnRef of joinOn) {
            const forkedTask = workflow.getTaskByRefName(joinOnRef);

            if (forkedTask === null) {
                // Task is not even scheduled yet
                allDone = false;
                break;
            }

            const taskStatus = forkedTask.getStatus();
            hasFailures = !taskStatus.isSuccessful() && !forkedTask.getWorkflowTask().isOptional();

            if (hasFailures) {
                failureReason.append(forkedTask.getReasonForIncompletion()).append(' ');
            }

            // Only add to task output if it's not empty
            if (!forkedTask.getOutputData().isEmpty()) {
                task.addOutput(joinOnRef, forkedTask.getOutputData());
            }

            if (!taskStatus.isTerminal()) {
                allDone = false;
            }

            if (hasFailures) {
                break;
            }

            // check for optional task failures
            if (forkedTask.getWorkflowTask().isOptional() && taskStatus === TaskModel.Status.COMPLETED_WITH_ERRORS) {
                optionalTaskFailures
                    .append(`${forkedTask.getTaskDefName()}/${forkedTask.getTaskId()}`)
                    .append(' ');
            }
        }

        if (allDone || hasFailures || optionalTaskFailures.length() > 0) {
            if (hasFailures) {
                task.setReasonForIncompletion(failureReason.toString());
                task.setStatus(TaskModel.Status.FAILED);
            } else if (optionalTaskFailures.length() > 0) {
                task.setStatus(TaskModel.Status.COMPLETED_WITH_ERRORS);
                optionalTaskFailures.append('completed with errors');
                task.setReasonForIncompletion(optionalTaskFailures.toString());
            } else {
                task.setStatus(TaskModel.Status.COMPLETED);
            }
            return true;
        }

        return false;
    }

    getEvaluationOffset(taskModel: TaskModel, defaultOffset: number): number {
        const index = taskModel.getPollCount() > 0 ? taskModel.getPollCount() - 1 : 0;
        if (index === 0) {
            return 0;
        }
        return Math.min(Math.pow(2, index), defaultOffset);
    }

    isAsync(): boolean {
        return true;
    }
}
