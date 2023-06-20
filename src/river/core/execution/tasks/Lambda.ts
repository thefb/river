import { WorkflowModel, TaskModel, WorkflowExecutor } from '...'; // Import the required dependencies

export class Lambda extends WorkflowSystemTask {
    constructor() {
        super(TASK_TYPE_LAMBDA);
    }

    execute(workflow: WorkflowModel, task: TaskModel, workflowExecutor: WorkflowExecutor): boolean {
        const taskInput = task.getInputData();
        const scriptExpression = taskInput[QUERY_EXPRESSION_PARAMETER] as string;

        try {
            if (StringUtils.isNotBlank(scriptExpression)) {
                const scriptExpressionBuilder = `function scriptFun(){ ${scriptExpression} } scriptFun();`;
                LOGGER.debug(`scriptExpressionBuilder: ${scriptExpressionBuilder}, task: ${task.getTaskId()}`);

                const returnValue = ScriptEvaluator.eval(scriptExpressionBuilder, taskInput);
                task.addOutput("result", returnValue);
                task.setStatus(TaskModel.Status.COMPLETED);
            } else {
                LOGGER.error(`Empty ${QUERY_EXPRESSION_PARAMETER} in Lambda task.`);
                task.setReasonForIncompletion(`Empty '${QUERY_EXPRESSION_PARAMETER}' in Lambda task's input parameters. A non-empty String value must be provided.`);
                task.setStatus(TaskModel.Status.FAILED);
            }
        } catch (e) {
            LOGGER.error(`Failed to execute Lambda Task: ${task.getTaskId()} in workflow: ${workflow.getWorkflowId()}`, e);
            task.setStatus(TaskModel.Status.FAILED);
            task.setReasonForIncompletion(e.getMessage());
            task.addOutput("error", e.getCause() != null ? e.getCause().getMessage() : e.getMessage());
        }

        return true;
    }
}
