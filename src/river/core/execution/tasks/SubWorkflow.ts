import { WorkflowModel, TaskModel, WorkflowExecutor, TransientException, StringUtils, ObjectMapper, StartWorkflowOperation, StartWorkflowInput, WorkflowDef } from '...'; // Import the required dependencies

class SubWorkflow extends WorkflowSystemTask {
    private static readonly LOGGER = LoggerFactory.getLogger(SubWorkflow.class);
    private static readonly SUB_WORKFLOW_ID = 'subWorkflowId';

    private readonly objectMapper: ObjectMapper;
    private readonly startWorkflowOperation: StartWorkflowOperation;

    constructor(objectMapper: ObjectMapper, startWorkflowOperation: StartWorkflowOperation) {
        super(TASK_TYPE_SUB_WORKFLOW);
        this.objectMapper = objectMapper;
        this.startWorkflowOperation = startWorkflowOperation;
    }

    start(workflow: WorkflowModel, task: TaskModel, workflowExecutor: WorkflowExecutor): void {
        const input = task.getInputData();
        const name = input.subWorkflowName.toString();
        const version = input.subWorkflowVersion as number;

        let workflowDefinition: WorkflowDef | null = null;
        if (input.subWorkflowDefinition != null) {
            // Convert the value back to a workflow definition object
            workflowDefinition = this.objectMapper.convertValue(input.subWorkflowDefinition, WorkflowDef);
            name = workflowDefinition.name;
        }

        let taskToDomain = workflow.getTaskToDomain();
        if (input.subWorkflowTaskToDomain instanceof Map) {
            taskToDomain = input.subWorkflowTaskToDomain as Map<string, string>;
        }

        let wfInput: Map<string, object> | null = input.workflowInput;
        if (wfInput == null || Object.keys(wfInput).length === 0) {
            wfInput = input;
        }
        const correlationId = workflow.getCorrelationId();

        try {
            const startWorkflowInput = new StartWorkflowInput();
            startWorkflowInput.workflowDefinition = workflowDefinition;
            startWorkflowInput.name = name;
            startWorkflowInput.version = version;
            startWorkflowInput.workflowInput = wfInput;
            startWorkflowInput.correlationId = correlationId;
            startWorkflowInput.parentWorkflowId = workflow.getWorkflowId();
            startWorkflowInput.parentWorkflowTaskId = task.getTaskId();
            startWorkflowInput.taskToDomain = taskToDomain;

            const subWorkflowId = this.startWorkflowOperation.execute(startWorkflowInput);

            task.setSubWorkflowId(subWorkflowId);
            // For backwards compatibility
            task.addOutput(SubWorkflow.SUB_WORKFLOW_ID, subWorkflowId);

            // Set task status based on current sub-workflow status, as the status can change in recursion by the time we update here.
            const subWorkflow = workflowExecutor.getWorkflow(subWorkflowId, false);
            this.updateTaskStatus(subWorkflow, task);
        } catch (te) {
            LOGGER.info(`A transient backend error happened when task ${task.getTaskId()} in ${workflow.toShortString()} tried to start sub workflow ${name}.`);
        } catch (ae) {
            task.setStatus(TaskModel.Status.FAILED);
            task.setReasonForIncompletion(ae.message);
            LOGGER.error(`Error starting sub workflow: ${name} from workflow: ${workflow.toShortString()}`, ae);
        }
    }

    execute(workflow: WorkflowModel, task: TaskModel, workflowExecutor: WorkflowExecutor): boolean {
        const workflowId = task.getSubWorkflowId();
        if (StringUtils.isEmpty(workflowId)) {
            return false;
        }

        const subWorkflow = workflowExecutor.getWorkflow(workflowId, false);
        const subWorkflowStatus = subWorkflow.getStatus();
        if (!subWorkflowStatus.isTerminal()) {
            return false;
        }

        this.updateTaskStatus(subWorkflow, task);
        return true;
    }

    cancel(workflow: WorkflowModel, task: TaskModel, workflowExecutor: WorkflowExecutor): void {
        const workflowId = task.getSubWorkflowId();
        if (StringUtils.isEmpty(workflowId)) {
            return;
        }
        const subWorkflow = workflowExecutor.getWorkflow(workflowId, true);
        subWorkflow.setStatus(WorkflowModel.Status.TERMINATED);
        const reason = StringUtils.isEmpty(workflow.getReasonForIncompletion())
            ? `Parent workflow has been terminated with status ${workflow.getStatus()}`
            : `Parent workflow has been terminated with reason: ${workflow.getReasonForIncompletion()}`;
        workflowExecutor.terminateWorkflow(subWorkflow, reason, null);
    }

    isAsync(): boolean {
        return true;
    }

    isAsyncComplete(task: TaskModel): boolean {
        return true;
    }

    private updateTaskStatus(subworkflow: WorkflowModel, task: TaskModel): void {
        const status = subworkflow.getStatus();
        switch (status) {
            case WorkflowModel.Status.RUNNING:
            case WorkflowModel.Status.PAUSED:
                task.setStatus(TaskModel.Status.IN_PROGRESS);
                break;
            case WorkflowModel.Status.COMPLETED:
                task.setStatus(TaskModel.Status.COMPLETED);
                break;
            case WorkflowModel.Status.FAILED:
                task.setStatus(TaskModel.Status.FAILED);
                break;
            case WorkflowModel.Status.TERMINATED:
                task.setStatus(TaskModel.Status.CANCELED);
                break;
            case WorkflowModel.Status.TIMED_OUT:
                task.setStatus(TaskModel.Status.TIMED_OUT);
                break;
            default:
                throw new NonTransientException('Subworkflow status does not conform to relevant task status.');
        }

        if (status.isTerminal()) {
            if (subworkflow.getExternalOutputPayloadStoragePath() != null) {
                task.setExternalOutputPayloadStoragePath(subworkflow.getExternalOutputPayloadStoragePath());
            } else {
                task.addOutput(subworkflow.getOutput());
            }
            if (!status.isSuccessful()) {
                task.setReasonForIncompletion(`Sub workflow ${subworkflow.toShortString()} failure reason: ${subworkflow.getReasonForIncompletion()}`);
            }
        }
    }

    isTaskRetrievalRequired(): boolean {
        return false;
    }
}
