import { TASK_TYPE_EVENT } from "../../../common/metadata/tasks/TaskType";
import { EventQueues } from "../../events/EventQueues";
import { WorkflowModel } from "../../model/WorkflowModel";
import { WorkflowExecutor } from "../WorkflowExecutor";

export class Event extends WorkflowSystemTask {
    private static readonly LOGGER = LoggerFactory.getLogger(Event);
    private static readonly NAME = "EVENT";
    private static readonly EVENT_PRODUCED = "event_produced";

    private readonly objectMapper: ObjectMapper;
    private readonly parametersUtils: ParametersUtils;
    private readonly eventQueues: EventQueues;

    constructor(eventQueues: EventQueues, parametersUtils: ParametersUtils, objectMapper: ObjectMapper) {
        super(TASK_TYPE_EVENT);
        this.parametersUtils = parametersUtils;
        this.eventQueues = eventQueues;
        this.objectMapper = objectMapper;
    }

    start(workflow: WorkflowModel, task: TaskModel, workflowExecutor: WorkflowExecutor): void {
        const payload: Record<string, any> = { ...task.getInputData() };
        payload.workflowInstanceId = workflow.getWorkflowId();
        payload.workflowType = workflow.getWorkflowName();
        payload.workflowVersion = workflow.getWorkflowVersion();
        payload.correlationId = workflow.getCorrelationId();

        task.setStatus(TaskModel.Status.IN_PROGRESS);
        task.addOutput(payload);

        try {
            task.addOutput(Event.EVENT_PRODUCED, this.computeQueueName(workflow, task));
        } catch (e) {
            task.setStatus(TaskModel.Status.FAILED);
            task.setReasonForIncompletion(e.getMessage());
            Event.LOGGER.error(`Error executing task: ${task.getTaskId()}, workflow: ${workflow.getWorkflowId()}`, e);
        }
    }

    execute(workflow: WorkflowModel, task: TaskModel, workflowExecutor: WorkflowExecutor): boolean {
        try {
            const queueName: string = task.getOutputData()[Event.EVENT_PRODUCED];
            const queue: ObservableQueue = this.getQueue(queueName, task.getTaskId());
            const message: Message = this.getPopulatedMessage(task);
            queue.publish([message]);
            Event.LOGGER.debug(`Published message: ${message.getId()} to queue: ${queue.getName()}`);
            if (!this.isAsyncComplete(task)) {
                task.setStatus(TaskModel.Status.COMPLETED);
                return true;
            }
        } catch (jpe) {
            task.setStatus(TaskModel.Status.FAILED);
            task.setReasonForIncompletion(`Error serializing JSON payload: ${jpe.getMessage()}`);
            Event.LOGGER.error(`Error serializing JSON payload for task: ${task.getTaskId()}, workflow: ${workflow.getWorkflowId()}`);
        } catch (e) {
            task.setStatus(TaskModel.Status.FAILED);
            task.setReasonForIncompletion(e.getMessage());
            Event.LOGGER.error(`Error executing task: ${task.getTaskId()}, workflow: ${workflow.getWorkflowId()}`, e);
        }
        return false;
    }

    cancel(workflow: WorkflowModel, task: TaskModel, workflowExecutor: WorkflowExecutor): void {
        const message: Message = new Message(task.getTaskId(), null, task.getTaskId());
        const queueName: string = this.computeQueueName(workflow, task);
        const queue: ObservableQueue = this.getQueue(queueName, task.getTaskId());
        queue.ack([message]);
    }

    private computeQueueName(workflow: WorkflowModel, task: TaskModel): string {
        const sinkValueRaw: string = task.getInputData().sink;
        const input: Record<string, any> = { sink: sinkValueRaw };
        const replaced: Record<string, any> = this.parametersUtils.getTaskInputV2(input, workflow, task.getTaskId(), null);
        let sinkValue: string = replaced.sink;
        let queueName: string = sinkValue;

        if (sinkValue.startsWith("conductor")) {
            if ("conductor" === sinkValue) {
                queueName = `${sinkValue}:${workflow.getWorkflowName()}:${task.getReferenceTaskName()}`;
            } else if (sinkValue.startsWith("conductor:")) {
                queueName = `conductor:${workflow.getWorkflowName()}:${sinkValue.replaceAll("conductor:", "")}`;
            } else {
                throw new Error(`Invalid / Unsupported sink specified: ${sinkValue}`);
            }
        }
        return queueName;
    }

    private getQueue(queueName: string, taskId: string): ObservableQueue {
        try {
            return this.eventQueues.getQueue(queueName);
        } catch (e) {
            throw new Error(`Error loading queue: ${queueName}, for task: ${taskId}, error: ${e.getMessage()}`);
        }
    }

    private getPopulatedMessage(task: TaskModel): Message {
        const payloadJson: string = this.objectMapper.writeValueAsString(task.getOutputData());
        return new Message(task.getTaskId(), payloadJson, task.getTaskId());
    }
}
