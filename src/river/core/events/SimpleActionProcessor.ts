import { Logger, LoggerFactory } from 'your-logging-library' // Replace with your actual logging library

interface ActionProcessor {
  execute(
    action: Action,
    payloadObject: any,
    event: string,
    messageId: string
  ): Map<string, Object>
}

interface ParametersUtils {
  replace(input: any, payload?: any): Map<string, Object>
}

interface JsonUtils {
  expand(payloadObject: any): any
}

interface StartWorkflowOperation {
  execute(startWorkflowInput: StartWorkflowInput): string
}

class SimpleActionProcessor implements ActionProcessor {
  private static readonly LOGGER: Logger = LoggerFactory.getLogger(
    SimpleActionProcessor
  )

  private readonly workflowExecutor: WorkflowExecutor
  private readonly parametersUtils: ParametersUtils
  private readonly jsonUtils: JsonUtils
  private readonly startWorkflowOperation: StartWorkflowOperation

  constructor (
    workflowExecutor: WorkflowExecutor,
    parametersUtils: ParametersUtils,
    jsonUtils: JsonUtils,
    startWorkflowOperation: StartWorkflowOperation
  ) {
    this.workflowExecutor = workflowExecutor
    this.parametersUtils = parametersUtils
    this.jsonUtils = jsonUtils
    this.startWorkflowOperation = startWorkflowOperation
  }

  execute (
    action: Action,
    payloadObject: any,
    event: string,
    messageId: string
  ): Map<string, Object> {
    SimpleActionProcessor.LOGGER.debug(
      'Executing action: {} for event: {} with messageId:{}',
      action.getAction(),
      event,
      messageId
    )

    let jsonObject: any = payloadObject
    if (action.isExpandInlineJSON()) {
      jsonObject = this.jsonUtils.expand(payloadObject)
    }

    switch (action.getAction()) {
      case 'start_workflow':
        return this.startWorkflow(action, jsonObject, event, messageId)
      case 'complete_task':
        return this.completeTask(
          action,
          jsonObject,
          action.getComplete_task(),
          TaskModel.Status.COMPLETED,
          event,
          messageId
        )
      case 'fail_task':
        return this.completeTask(
          action,
          jsonObject,
          action.getFail_task(),
          TaskModel.Status.FAILED,
          event,
          messageId
        )
      default:
        break
    }
    throw new Error(
      `Action not supported ${action.getAction()} for event ${event}`
    )
  }

  private completeTask (
    action: Action,
    payload: any,
    taskDetails: TaskDetails,
    status: TaskModel.Status,
    event: string,
    messageId: string
  ): Map<string, Object> {
    const input: Map<string, Object> = new Map()
    input.set('workflowId', taskDetails.getWorkflowId())
    input.set('taskId', taskDetails.getTaskId())
    input.set('taskRefName', taskDetails.getTaskRefName())
    input.setAll(taskDetails.getOutput())

    const replaced: Map<string, Object> = this.parametersUtils.replace(
      input,
      payload
    )
    const workflowId: string = replaced.get('workflowId') as string
    const taskId: string = replaced.get('taskId') as string
    const taskRefName: string = replaced.get('taskRefName') as string

    let taskModel: TaskModel | null = null
    if (taskId) {
      taskModel = this.workflowExecutor.getTask(taskId)
    } else if (workflowId && taskRefName) {
      const workflow: WorkflowModel | null = this.workflowExecutor.getWorkflow(
        workflowId,
        true
      )
      if (!workflow) {
        replaced.set('error', `No workflow found with ID: ${workflowId}`)
        return replaced
      }
      taskModel = workflow.getTaskByRefName(taskRefName)
      const loopOverTaskList: TaskModel[] = workflow
        .getTasks()
        .filter(t =>
          TaskUtils.removeIterationFromTaskRefName(
            t.getReferenceTaskName()
          ).equals(taskRefName)
        )
      if (loopOverTaskList.length > 0) {
        taskModel = loopOverTaskList.sort(
          (a, b) => b.getIteration() - a.getIteration()
        )[0]
      }
    }

    if (!taskModel) {
      replaced.set(
        'error',
        `No task found with taskId: ${taskId}, reference name: ${taskRefName}, workflowId: ${workflowId}`
      )
      return replaced
    }

    taskModel.setStatus(status)
    taskModel.setOutputData(replaced)
    taskModel.setOutputMessage(taskDetails.getOutputMessage())
    taskModel.addOutput('conductor.event.messageId', messageId)
    taskModel.addOutput('conductor.event.name', event)

    try {
      this.workflowExecutor.updateTask(new TaskResult(taskModel.toTask()))
      SimpleActionProcessor.LOGGER.debug(
        'Updated task: {} in workflow:{} with status: {} for event: {} for message:{}',
        taskId,
        workflowId,
        status,
        event,
        messageId
      )
    } catch (e) {
      Monitors.recordEventActionError(
        action.getAction().name(),
        taskModel.getTaskType(),
        event
      )
      SimpleActionProcessor.LOGGER.error(
        `Error updating task: ${taskDetails.getTaskRefName()} in workflow: ${taskDetails.getWorkflowId()} in action: ${action.getAction()} for event: ${event} for message: ${messageId}`,
        e
      )
      replaced.set('error', e.getMessage())
      throw e
    }
    return replaced
  }

  private startWorkflow (
    action: Action,
    payload: any,
    event: string,
    messageId: string
  ): Map<string, Object> {
    const params: StartWorkflow = action.getStart_workflow()
    const output: Map<string, Object> = new Map()
    try {
      const inputParams: Map<string, Object> = params.getInput()
      const workflowInput: Map<string, Object> = this.parametersUtils.replace(
        inputParams,
        payload
      )

      const paramsMap: Map<string, Object> = new Map()
      params
        .getCorrelationId()
        ?.ifPresent(value => paramsMap.set('correlationId', value))
      const replaced: Map<string, Object> = this.parametersUtils.replace(
        paramsMap,
        payload
      )

      workflowInput.set('conductor.event.messageId', messageId)
      workflowInput.set('conductor.event.name', event)

      const startWorkflowInput: StartWorkflowInput = new StartWorkflowInput()
      startWorkflowInput.setName(params.getName())
      startWorkflowInput.setVersion(params.getVersion())
      startWorkflowInput.setCorrelationId(
        replaced.get('correlationId')?.toString() || params.getCorrelationId()
      )
      startWorkflowInput.setWorkflowInput(workflowInput)
      startWorkflowInput.setEvent(event)
      startWorkflowInput.setTaskToDomain(params.getTaskToDomain())

      const workflowId: string =
        this.startWorkflowOperation.execute(startWorkflowInput)

      output.set('workflowId', workflowId)
      SimpleActionProcessor.LOGGER.debug(
        `Started workflow: ${params.getName()}/${params.getVersion()}/${workflowId} for event: ${event} for message:${messageId}`
      )
    } catch (e) {
      Monitors.recordEventActionError(
        action.getAction().name(),
        params.getName(),
        event
      )
      SimpleActionProcessor.LOGGER.error(
        `Error starting workflow: ${params.getName()}, version: ${params.getVersion()}, for event: ${event} for message: ${messageId}`,
        e
      )
      output.set('error', e.getMessage())
      throw e
    }
    return output
  }
}
