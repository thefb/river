import { WorkflowModel, TaskModel, WorkflowExecutor } from '...'; // Import the required dependencies

class SetVariable extends WorkflowSystemTask {
    private readonly properties: ConductorProperties;
    private readonly objectMapper: ObjectMapper;
    private readonly executionDAOFacade: ExecutionDAOFacade;

    constructor(
        properties: ConductorProperties,
        objectMapper: ObjectMapper,
        executionDAOFacade: ExecutionDAOFacade
    ) {
        super(TASK_TYPE_SET_VARIABLE);
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.executionDAOFacade = executionDAOFacade;
    }

    private validateVariablesSize(workflow: WorkflowModel, task: TaskModel, variables: Record<string, any>): boolean {
        const workflowId = workflow.getWorkflowId();
        const maxThreshold = this.properties.getMaxWorkflowVariablesPayloadSizeThreshold().toKilobytes();

        try {
            const payloadBytes = this.objectMapper.writeValueAsBytes(variables);
            const payloadSize = payloadBytes.length;

            if (payloadSize > maxThreshold * 1024) {
                const errorMsg = `The variables payload size: ${payloadSize} of workflow: ${workflowId} is greater than the permissible limit: ${maxThreshold} bytes`;
                LOGGER.error(errorMsg);
                task.setReasonForIncompletion(errorMsg);
                return false;
            }
            return true;
        } catch (e) {
            LOGGER.error(`Unable to validate variables payload size of workflow: ${workflowId}`, e);
            throw new NonTransientException(`Unable to validate variables payload size of workflow: ${workflowId}`, e);
        }
    }

    execute(workflow: WorkflowModel, task: TaskModel, provider: WorkflowExecutor): boolean {
        const variables = workflow.getVariables();
        const input = task.getInputData();
        const taskId = task.getTaskId();
        const newKeys: string[] = [];
        const previousValues: Record<string, any> = {};

        if (input != null && Object.keys(input).length > 0) {
            Object.keys(input).forEach(key => {
                if (variables.hasOwnProperty(key)) {
                    previousValues[key] = variables[key];
                } else {
                    newKeys.push(key);
                }
                variables[key] = input[key];
                LOGGER.debug(`Task: ${taskId} setting value for variable: ${key}`);
            });

            if (!this.validateVariablesSize(workflow, task, variables)) {
                // Restore previous variables
                Object.keys(previousValues).forEach(key => {
                    variables[key] = previousValues[key];
                });
                newKeys.forEach(key => {
                    delete variables[key];
                });

                task.setStatus(TaskModel.Status.FAILED_WITH_TERMINAL_ERROR);
                return true;
            }
        }

        task.setStatus(TaskModel.Status.COMPLETED);
        this.executionDAOFacade.updateWorkflow(workflow);
        return true;
    }
}
