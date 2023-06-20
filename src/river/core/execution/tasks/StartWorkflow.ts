import { WorkflowModel, TaskModel, WorkflowExecutor, TransientException, StringUtils } from '...'; // Import the required dependencies

class StartWorkflow extends WorkflowSystemTask {
    private readonly objectMapper: ObjectMapper;
    private readonly validator: Validator;
    private readonly startWorkflowOperation: StartWorkflowOperation;

    private static readonly WORKFLOW_ID = 'workflowId';
    private static readonly START_WORKFLOW_PARAMETER = 'startWorkflow';

    constructor(
        objectMapper: ObjectMapper,
        validator: Validator,
        startWorkflowOperation: StartWorkflowOperation
    ) {
        super(TASK_TYPE_START_WORKFLOW);
        this.objectMapper = objectMapper;
        this.validator = validator;
        this.startWorkflowOperation = startWorkflowOperation;
    }

    start(workflow: WorkflowModel, taskModel: TaskModel, workflowExecutor: WorkflowExecutor): void {
        const request = this.getRequest(taskModel);
        if (!request) {
            return;
        }

        if (!request.taskToDomain || Object.keys(request.taskToDomain).length === 0) {
            const workflowTaskToDomainMap = workflow.getTaskToDomain();
            if (workflowTaskToDomainMap) {
                request.taskToDomain = { ...workflowTaskToDomainMap };
            }
        }

        // Set the correlation id of the starter workflow if it's empty in the StartWorkflowRequest
        request.correlationId = StringUtils.defaultIfBlank(request.correlationId, workflow.getCorrelationId());

        try {
            const workflowId = this.startWorkflow(request, workflow.getWorkflowId());
            taskModel.addOutput(StartWorkflow.WORKFLOW_ID, workflowId);
            taskModel.setStatus(TaskModel.Status.COMPLETED);
        } catch (te) {
            LOGGER.info(`A transient backend error happened when task ${taskModel.getTaskId()} in ${workflow.toShortString()} tried to start workflow ${request.name}.`);
        } catch (ae) {
            taskModel.setStatus(TaskModel.Status.FAILED);
            taskModel.setReasonForIncompletion(ae.message);
            LOGGER.error(`Error starting workflow: ${request.name} from workflow: ${workflow.toShortString()}`, ae);
        }
    }

    private getRequest(taskModel: TaskModel): StartWorkflowRequest | null {
        const taskInput = taskModel.getInputData();
        let startWorkflowRequest: StartWorkflowRequest | null = null;

        if (!taskInput.hasOwnProperty(StartWorkflow.START_WORKFLOW_PARAMETER)) {
            taskModel.setStatus(TaskModel.Status.FAILED);
            taskModel.setReasonForIncompletion(`Missing '${StartWorkflow.START_WORKFLOW_PARAMETER}' in input data.`);
        } else {
            try {
                startWorkflowRequest = this.objectMapper.convertValue(
                    taskInput[StartWorkflow.START_WORKFLOW_PARAMETER],
                    StartWorkflowRequest
                );

                const violations = this.validator.validate(startWorkflowRequest);
                if (violations.length > 0) {
                    const reasonForIncompletion = `${StartWorkflow.START_WORKFLOW_PARAMETER} validation failed. `;
                    for (const violation of violations) {
                        reasonForIncompletion += `'${violation.propertyPath.toString()}' -> ${violation.message}. `;
                    }
                    taskModel.setStatus(TaskModel.Status.FAILED);
                    taskModel.setReasonForIncompletion(reasonForIncompletion);
                    startWorkflowRequest = null;
                }
            } catch (e) {
                LOGGER.error(`Error reading StartWorkflowRequest for ${taskModel}`, e);
                taskModel.setStatus(TaskModel.Status.FAILED);
                taskModel.setReasonForIncompletion(`Error reading StartWorkflowRequest. ${e.message}`);
            }
        }

        return startWorkflowRequest;
    }

    private startWorkflow(request: StartWorkflowRequest, workflowId: string): string {
        const input = new StartWorkflowInput(request);
        input.setTriggeringWorkflowId(workflowId);
        return this.startWorkflowOperation.execute(input);
    }

    isAsync(): boolean {
        return true;
    }
}
