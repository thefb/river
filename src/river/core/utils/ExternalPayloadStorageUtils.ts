import { ConductorProperties } from '../config/ConductorProperties';
import { NonTransientException } from '../exception/NonTransientException';
import { TerminateWorkflowException } from '../exception/TerminateWorkflowException';
import { WorkflowModel } from '../model/WorkflowModel';

export class ExternalPayloadStorageUtils {
  private externalPayloadStorage: ExternalPayloadStorage;
  private properties: ConductorProperties; // Assuming ConductorProperties is defined
  private objectMapper: ObjectMapper; // Assuming ObjectMapper is defined

  constructor(
    externalPayloadStorage: ExternalPayloadStorage,
    properties: ConductorProperties,
    objectMapper: ObjectMapper
  ) {
    this.externalPayloadStorage = externalPayloadStorage;
    this.properties = properties;
    this.objectMapper = objectMapper;
  }

  public downloadPayload(path: string): Map<string, object> {
    try {
      const inputStream = this.externalPayloadStorage.download(path);
      const payloadString = this.inputStreamToString(inputStream);
      return this.objectMapper.readValue(payloadString, Map);
    } catch (te) {
      throw te;
    } catch (e) {
      console.error(`Unable to download payload from external storage path: ${path}`, e);
      throw new NonTransientException(`Unable to download payload from external storage path: ${path}`, e);
    }
  }

  public verifyAndUpload<T>(entity: T, payloadType: PayloadType): void {
    if (!this.shouldUpload(entity, payloadType)) {
      return;
    }

    let threshold = 0;
    let maxThreshold = 0;
    let payload = new Map<string, object>();
    let workflowId = '';
    switch (payloadType) {
      case PayloadType.TASK_INPUT:
        threshold = this.properties.getTaskInputPayloadSizeThreshold().toKilobytes();
        maxThreshold = this.properties.getMaxTaskInputPayloadSizeThreshold().toKilobytes();
        payload = (entity as TaskModel).getInputData();
        workflowId = (entity as TaskModel).getWorkflowInstanceId();
        break;
      case PayloadType.TASK_OUTPUT:
        threshold = this.properties.getTaskOutputPayloadSizeThreshold().toKilobytes();
        maxThreshold = this.properties.getMaxTaskOutputPayloadSizeThreshold().toKilobytes();
        payload = (entity as TaskModel).getOutputData();
        workflowId = (entity as TaskModel).getWorkflowInstanceId();
        break;
      case PayloadType.WORKFLOW_INPUT:
        threshold = this.properties.getWorkflowInputPayloadSizeThreshold().toKilobytes();
        maxThreshold = this.properties.getMaxWorkflowInputPayloadSizeThreshold().toKilobytes();
        payload = (entity as WorkflowModel).getInput();
        workflowId = (entity as WorkflowModel).getWorkflowId();
        break;
      case PayloadType.WORKFLOW_OUTPUT:
        threshold = this.properties.getWorkflowOutputPayloadSizeThreshold().toKilobytes();
        maxThreshold = this.properties.getMaxWorkflowOutputPayloadSizeThreshold().toKilobytes();
        payload = (entity as WorkflowModel).getOutput();
        workflowId = (entity as WorkflowModel).getWorkflowId();
        break;
    }

    try {
      const byteArrayOutputStream = new ByteArrayOutputStream();
      this.objectMapper.writeValue(byteArrayOutputStream, payload);
      const payloadBytes = byteArrayOutputStream.toByteArray();
      const payloadSize = payloadBytes.length;

      const maxThresholdInBytes = maxThreshold * 1024;
      if (payloadSize > maxThresholdInBytes) {
        if (entity instanceof TaskModel) {
          const errorMsg = `The payload size: ${payloadSize} of task: ${entity.getTaskId()} in workflow: ${entity.getWorkflowInstanceId()} is greater than the permissible limit: ${maxThresholdInBytes} bytes`;
          this.failTask(entity, payloadType, errorMsg);
        } else {
          const errorMsg = `The payload size: ${payloadSize} of workflow: ${entity.getWorkflowId()} is greater than the permissible limit: ${maxThresholdInBytes} bytes`;
          this.failWorkflow(entity, payloadType, errorMsg);
        }
      } else if (payloadSize > threshold * 1024) {
        let externalPayloadStoragePath = '';
        switch (payloadType) {
          case PayloadType.TASK_INPUT:
            externalPayloadStoragePath = this.uploadHelper(payloadBytes, payloadSize, PayloadType.TASK_INPUT);
            (entity as TaskModel).externalizeInput(externalPayloadStoragePath);
            Monitors.recordExternalPayloadStorageUsage(
              (entity as TaskModel).getTaskDefName(),
              ExternalPayloadStorage.Operation.WRITE.toString(),
              PayloadType.TASK_INPUT.toString()
            );
            break;
          case PayloadType.TASK_OUTPUT:
            externalPayloadStoragePath = this.uploadHelper(payloadBytes, payloadSize, PayloadType.TASK_OUTPUT);
            (entity as TaskModel).externalizeOutput(externalPayloadStoragePath);
            Monitors.recordExternalPayloadStorageUsage(
              (entity as TaskModel).getTaskDefName(),
              ExternalPayloadStorage.Operation.WRITE.toString(),
              PayloadType.TASK_OUTPUT.toString()
            );
            break;
          case PayloadType.WORKFLOW_INPUT:
            externalPayloadStoragePath = this.uploadHelper(payloadBytes, payloadSize, PayloadType.WORKFLOW_INPUT);
            (entity as WorkflowModel).externalizeInput(externalPayloadStoragePath);
            Monitors.recordExternalPayloadStorageUsage(
              (entity as WorkflowModel).getWorkflowName(),
              ExternalPayloadStorage.Operation.WRITE.toString(),
              PayloadType.WORKFLOW_INPUT.toString()
            );
            break;
          case PayloadType.WORKFLOW_OUTPUT:
            externalPayloadStoragePath = this.uploadHelper(payloadBytes, payloadSize, PayloadType.WORKFLOW_OUTPUT);
            (entity as WorkflowModel).externalizeOutput(externalPayloadStoragePath);
            Monitors.recordExternalPayloadStorageUsage(
              (entity as WorkflowModel).getWorkflowName(),
              ExternalPayloadStorage.Operation.WRITE.toString(),
              PayloadType.WORKFLOW_OUTPUT.toString()
            );
            break;
        }
      }
    } catch (te) {
      throw te;
    } catch (e) {
      console.error(`Unable to upload payload to external storage for workflow: ${workflowId}`, e);
      throw new NonTransientException(`Unable to upload payload to external storage for workflow: ${workflowId}`, e);
    }
  }

  private uploadHelper(
    payloadBytes: Uint8Array,
    payloadSize: number,
    payloadType: PayloadType
  ): string {
    const location: ExternalStorageLocation = this.externalPayloadStorage.getLocation(
      ExternalPayloadStorage.Operation.WRITE,
      payloadType,
      '',
      payloadBytes
    );
    this.externalPayloadStorage.upload(location.getPath(), new ByteArrayInputStream(payloadBytes), payloadSize);
    return location.getPath();
  }

  private failTask(task: TaskModel, payloadType: PayloadType, errorMsg: string): void {
    console.error(errorMsg);
    task.setReasonForIncompletion(errorMsg);
    task.setStatus(TaskModel.Status.FAILED_WITH_TERMINAL_ERROR);
    if (payloadType === PayloadType.TASK_INPUT) {
      task.setInputData(new Map());
    } else {
      task.setOutputData(new Map());
    }
  }

  private failWorkflow(workflow: WorkflowModel, payloadType: PayloadType, errorMsg: string): void {
    console.error(errorMsg);
    if (payloadType === PayloadType.WORKFLOW_INPUT) {
      workflow.setInput(new Map());
    } else {
      workflow.setOutput(new Map());
    }
    throw new TerminateWorkflowException(errorMsg);
  }

  private shouldUpload<T>(entity: T, payloadType: PayloadType): boolean {
    if (entity instanceof TaskModel) {
      const taskModel = entity as TaskModel;
      if (payloadType === PayloadType.TASK_INPUT) {
        return !taskModel.getRawInputData().isEmpty();
      } else {
        return !taskModel.getRawOutputData().isEmpty();
      }
    } else {
      const workflowModel = entity as WorkflowModel;
      if (payloadType === PayloadType.WORKFLOW_INPUT) {
        return !workflowModel.getRawInput().isEmpty();
      } else {
        return !workflowModel.getRawOutput().isEmpty();
      }
    }
  }

  private inputStreamToString(inputStream: InputStream): string {
    let result = '';
    let nextByte;
    while ((nextByte = inputStream.read()) !== -1) {
      result += String.fromCharCode(nextByte);
    }
    return result;
  }
}
