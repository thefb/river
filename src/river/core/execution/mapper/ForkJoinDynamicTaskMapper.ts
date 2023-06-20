export class ForkJoinDynamicTaskMapper implements TaskMapper {
  private static readonly LOGGER = getLogger(ForkJoinDynamicTaskMapper.name);

  private readonly idGenerator: IDGenerator;
  private readonly parametersUtils: ParametersUtils;
  private readonly objectMapper: ObjectMapper;
  private readonly metadataDAO: MetadataDAO;
  private static readonly ListOfWorkflowTasks: TypeReference<WorkflowTask[]> = new TypeReference<WorkflowTask[]>() {};

  constructor(
    idGenerator: IDGenerator,
    parametersUtils: ParametersUtils,
    objectMapper: ObjectMapper,
    metadataDAO: MetadataDAO
  ) {
    this.idGenerator = idGenerator;
    this.parametersUtils = parametersUtils;
    this.objectMapper = objectMapper;
    this.metadataDAO = metadataDAO;
  }

  getTaskType(): string {
    return 'FORK_JOIN_DYNAMIC';
  }

  getMappedTasks(taskMapperContext: TaskMapperContext): TaskModel[] {
    ForkJoinDynamicTaskMapper.LOGGER.debug('TaskMapperContext {} in ForkJoinDynamicTaskMapper', taskMapperContext);

    const workflowTask: WorkflowTask = taskMapperContext.getWorkflowTask();
    const workflowModel: WorkflowModel = taskMapperContext.getWorkflowModel();
    const retryCount: number = taskMapperContext.getRetryCount();

    const mappedTasks: TaskModel[] = [];
    const workflowTasksAndInputPair: Pair<WorkflowTask[], Map<string, Map<string, unknown>>> =
      workflowTask.getDynamicForkTasksParam() != null
        ? this.getDynamicForkTasksAndInput(workflowTask, workflowModel, workflowTask.getDynamicForkTasksParam())
        : this.getDynamicForkJoinTasksAndInput(workflowTask, workflowModel);

    const dynForkTasks: WorkflowTask[] = workflowTasksAndInputPair.getLeft();
    const tasksInput: Map<string, Map<string, unknown>> = workflowTasksAndInputPair.getRight();

    const forkDynamicTask: TaskModel = this.createDynamicForkTask(taskMapperContext, dynForkTasks);
    mappedTasks.push(forkDynamicTask);

    const joinOnTaskRefs: string[] = [];
    for (const dynForkTask of dynForkTasks) {
      const forkedTasks: TaskModel[] = taskMapperContext.getDeciderService().getTasksToBeScheduled(workflowModel, dynForkTask, retryCount);

      if (forkedTasks == null || forkedTasks.length === 0) {
        const existingTaskRefName: string | undefined = workflowModel.getTasks().find((runningTask: TaskModel) =>
          runningTask.getStatus().equals(TaskModel.Status.IN_PROGRESS) || runningTask.getStatus().isTerminal())
          .map((task: TaskModel) => task.getReferenceTaskName())
          .filter((refTaskName: string) => refTaskName.equals(dynForkTask.getTaskReferenceName()))
          .findAny();

        let terminateMessage: string =
          `No dynamic tasks could be created for the Workflow: ${workflowModel.toShortString()}, Dynamic Fork Task: ${dynForkTask}`;
        if (existingTaskRefName != null) {
          terminateMessage += `Attempted to create a duplicate task reference name: ${existingTaskRefName}`;
        }
        throw new TerminateWorkflowException(terminateMessage);
      }

      for (const forkedTask of forkedTasks) {
        const forkedTaskInput: Map<string, unknown> = tasksInput.get(forkedTask.getReferenceTaskName());
        forkedTask.addInput(forkedTaskInput);
      }

      mappedTasks.push(...forkedTasks);
      const last: TaskModel = forkedTasks[forkedTasks.length - 1];
      joinOnTaskRefs.push(last.getReferenceTaskName());
    }

    const joinWorkflowTask: WorkflowTask = workflowModel.getWorkflowDefinition().getNextTask(workflowTask.getTaskReferenceName());
    if (joinWorkflowTask == null || !joinWorkflowTask.getType().equals(TaskType.JOIN.name())) {
      throw new TerminateWorkflowException('Dynamic join definition is not followed by a join task. Check the workflow definition.');
    }

    const joinInput: Map<string, unknown> = new Map<string, unknown>();
    joinInput.set('joinOn', joinOnTaskRefs);
    const joinTask: TaskModel = this.createJoinTask(workflowModel, joinWorkflowTask, joinInput);
    mappedTasks.push(joinTask);

    return mappedTasks;
  }

  private createDynamicForkTask(taskMapperContext: TaskMapperContext, dynForkTasks: WorkflowTask[]): TaskModel {
    const forkDynamicTask: TaskModel = taskMapperContext.createTaskModel();
    forkDynamicTask.setTaskType(TaskType.TASK_TYPE_FORK);
    forkDynamicTask.setTaskDefName(TaskType.TASK_TYPE_FORK);
    forkDynamicTask.setStartTime(Date.now());
    forkDynamicTask.setEndTime(Date.now());
    const forkedTaskNames: string[] = dynForkTasks.map((dynForkTask: WorkflowTask) => dynForkTask.getTaskReferenceName());
    forkDynamicTask.getInputData().set('forkedTasks', forkedTaskNames);
    forkDynamicTask.getInputData().set('forkedTaskDefs', dynForkTasks);
    forkDynamicTask.setStatus(TaskModel.Status.COMPLETED);
    return forkDynamicTask;
  }

  private createJoinTask(workflowModel: WorkflowModel, joinWorkflowTask: WorkflowTask, joinInput: Map<string, unknown>): TaskModel {
    const joinTask: TaskModel = new TaskModel();
    joinTask.setTaskType(TaskType.TASK_TYPE_JOIN);
    joinTask.setTaskDefName(TaskType.TASK_TYPE_JOIN);
    joinTask.setReferenceTaskName(joinWorkflowTask.getTaskReferenceName());
    joinTask.setWorkflowInstanceId(workflowModel.getWorkflowId());
    joinTask.setWorkflowType(workflowModel.getWorkflowName());
    joinTask.setCorrelationId(workflowModel.getCorrelationId());
    joinTask.setScheduledTime(Date.now());
    joinTask.setStartTime(Date.now());
    joinTask.setInputData(joinInput);
    joinTask.setTaskId(this.idGenerator.generate());
    joinTask.setStatus(TaskModel.Status.IN_PROGRESS);
    joinTask.setWorkflowTask(joinWorkflowTask);
    joinTask.setWorkflowPriority(workflowModel.getPriority());
    return joinTask;
  }

  private getDynamicForkTasksAndInput(workflowTask: WorkflowTask, workflowModel: WorkflowModel, dynamicForkTaskParam: string): Pair<WorkflowTask[], Map<string, Map<string, unknown>>> {
    const input: Map<string, unknown> = this.parametersUtils.getTaskInput(workflowTask.getInputParameters(), workflowModel, null, null);
    const dynamicForkTasksJson: unknown = input.get(dynamicForkTaskParam);
    let dynamicForkWorkflowTasks: WorkflowTask[] = this.objectMapper.convertValue(dynamicForkTasksJson, ForkJoinDynamicTaskMapper.ListOfWorkflowTasks);
    if (dynamicForkWorkflowTasks == null) {
      dynamicForkWorkflowTasks = [];
    }
    for (const dynamicForkWorkflowTask of dynamicForkWorkflowTasks) {
      if (dynamicForkWorkflowTask.getTaskDefinition() == null && StringUtils.isNotBlank(dynamicForkWorkflowTask.getName())) {
        dynamicForkWorkflowTask.setTaskDefinition(metadataDAO.getTaskDef(dynamicForkWorkflowTask.getName()));
      }
    }
    const dynamicForkTasksInput: unknown = input.get(workflowTask.getDynamicForkTasksInputParamName());
    if (!(dynamicForkTasksInput instanceof Map)) {
      throw new TerminateWorkflowException(`Input to the dynamically forked tasks is not a map -> expecting a map of K,V  but found ${dynamicForkTasksInput}`);
    }
    return new Pair(dynamicForkWorkflowTasks, dynamicForkTasksInput as Map<string, Map<string, unknown>>);
  }

  private getDynamicForkJoinTasksAndInput(workflowTask: WorkflowTask, workflowModel: WorkflowModel): Pair<WorkflowTask[], Map<string, Map<string, unknown>>> {
    const dynamicForkJoinTaskParam: string = workflowTask.getDynamicForkJoinTasksParam();
    const input: Map<string, unknown> = this.parametersUtils.getTaskInput(workflowTask.getInputParameters(), workflowModel, null, null);
    const paramValue: unknown = input.get(dynamicForkJoinTaskParam);
    const dynamicForkJoinTaskList: DynamicForkJoinTaskList = this.objectMapper.convertValue(paramValue, DynamicForkJoinTaskList);
    if (dynamicForkJoinTaskList == null) {
      const reason: string = `Dynamic tasks could not be created. The value of ${dynamicForkJoinTaskParam} from task's input ${input} has no dynamic tasks to be scheduled`;
      ForkJoinDynamicTaskMapper.LOGGER.error(reason);
      throw new TerminateWorkflowException(reason);
    }
    const dynamicForkJoinTasksInput: Map<string, Map<string, unknown>> = new Map<string, Map<string, unknown>>();

    const dynamicForkJoinWorkflowTasks: WorkflowTask[] = dynamicForkJoinTaskList.getDynamicTasks().map((dynamicForkJoinTask: DynamicForkJoinTask) => {
      const dynamicForkJoinWorkflowTask: WorkflowTask = new WorkflowTask();
      dynamicForkJoinWorkflowTask.setTaskReferenceName(dynamicForkJoinTask.getReferenceName());
      dynamicForkJoinWorkflowTask.setName(dynamicForkJoinTask.getTaskName());
      dynamicForkJoinWorkflowTask.setType(dynamicForkJoinTask.getType());
      if (dynamicForkJoinWorkflowTask.getTaskDefinition() == null && StringUtils.isNotBlank(dynamicForkJoinWorkflowTask.getName())) {
        dynamicForkJoinWorkflowTask.setTaskDefinition(metadataDAO.getTaskDef(dynamicForkJoinTask.getTaskName()));
      }
      dynamicForkJoinTasksInput.set(dynamicForkJoinTask.getReferenceName(), dynamicForkJoinTask.getInput());
      return dynamicForkJoinWorkflowTask;
    });

    return new Pair(dynamicForkJoinWorkflowTasks, dynamicForkJoinTasksInput);
  }
}
