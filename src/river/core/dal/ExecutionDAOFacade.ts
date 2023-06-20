import { List } from 'lodash';
import {
    Logger,
    LoggerFactory,
    ObjectMapper,
    PreDestroy,
    ScheduledThreadPoolExecutor,
    TimeUnit
  } from 'your-library'; // Replace 'your-library' with the actual library you're using
import { Task } from '../../common/metadata/tasks/Task';
import { TaskDef } from '../../common/metadata/tasks/TaskDef';
import { WorkflowDef } from '../../common/metadata/workflow/WorkflowDef';
import { SearchResult } from '../../common/run/SearchResult';
import { ConductorProperties } from '../config/ConductorProperties';
import { WorkflowModel } from '../model/WorkflowModel';
  
  class ExecutionDAOFacade {
    private static readonly LOGGER: Logger = LoggerFactory.getLogger(ExecutionDAOFacade);
  
    private static readonly ARCHIVED_FIELD: string = "archived";
    private static readonly RAW_JSON_FIELD: string = "rawJSON";
  
    private readonly executionDAO: ExecutionDAO;
    private readonly queueDAO: QueueDAO;
    private readonly indexDAO: IndexDAO;
    private readonly rateLimitingDao: RateLimitingDAO;
    private readonly concurrentExecutionLimitDAO: ConcurrentExecutionLimitDAO;
    private readonly pollDataDAO: PollDataDAO;
    private readonly objectMapper: ObjectMapper;
    private readonly properties: ConductorProperties;
    private readonly externalPayloadStorageUtils: ExternalPayloadStorageUtils;
  
    private readonly scheduledThreadPoolExecutor: ScheduledThreadPoolExecutor;
  
    constructor(
      executionDAO: ExecutionDAO,
      queueDAO: QueueDAO,
      indexDAO: IndexDAO,
      rateLimitingDao: RateLimitingDAO,
      concurrentExecutionLimitDAO: ConcurrentExecutionLimitDAO,
      pollDataDAO: PollDataDAO,
      objectMapper: ObjectMapper,
      properties: ConductorProperties,
      externalPayloadStorageUtils: ExternalPayloadStorageUtils
    ) {
      this.executionDAO = executionDAO;
      this.queueDAO = queueDAO;
      this.indexDAO = indexDAO;
      this.rateLimitingDao = rateLimitingDao;
      this.concurrentExecutionLimitDAO = concurrentExecutionLimitDAO;
      this.pollDataDAO = pollDataDAO;
      this.objectMapper = objectMapper;
      this.properties = properties;
      this.externalPayloadStorageUtils = externalPayloadStorageUtils;
      this.scheduledThreadPoolExecutor = new ScheduledThreadPoolExecutor(
        4,
        (runnable, executor) => {
          ExecutionDAOFacade.LOGGER.warn(
            "Request {} to delay updating index dropped in executor {}",
            runnable,
            executor
          );
          Monitors.recordDiscardedIndexingCount("delayQueue");
        }
      );
      this.scheduledThreadPoolExecutor.setRemoveOnCancelPolicy(true);
    }
  
    @PreDestroy
    public shutdownExecutorService(): void {
      try {
        ExecutionDAOFacade.LOGGER.info("Gracefully shutdown executor service");
        this.scheduledThreadPoolExecutor.shutdown();
        if (
          this.scheduledThreadPoolExecutor.awaitTermination(
            this.properties.getAsyncUpdateDelay().getSeconds(),
            TimeUnit.SECONDS
          )
        ) {
          ExecutionDAOFacade.LOGGER.debug("tasks completed, shutting down");
        } else {
          ExecutionDAOFacade.LOGGER.warn(
            "Forcing shutdown after waiting for {} seconds",
            this.properties.getAsyncUpdateDelay()
          );
          this.scheduledThreadPoolExecutor.shutdownNow();
        }
      } catch (ie) {
        ExecutionDAOFacade.LOGGER.warn(
          "Shutdown interrupted, invoking shutdownNow on scheduledThreadPoolExecutor for delay queue"
        );
        this.scheduledThreadPoolExecutor.shutdownNow();
        Thread.currentThread().interrupt();
      }
    }
  
    public getWorkflowModel(workflowId: string, includeTasks: boolean): WorkflowModel {
      const workflowModel: WorkflowModel = this.getWorkflowModelFromDataStore(
        workflowId,
        includeTasks
      );
      this.populateWorkflowAndTaskPayloadData(workflowModel);
      return workflowModel;
    }
  
    /**
     * Fetches the {@link Workflow} object from the data store given the id. Attempts to fetch from
     * {@link ExecutionDAO} first, if not found, attempts to fetch from {@link IndexDAO}.
     *
     * @param workflowId the id of the workflow to be fetched
     * @param includeTasks if true, fetches the {@link Task} data in the workflow.
     * @return the {@link Workflow} object
     * @throws NotFoundException no such {@link Workflow} is found.
     * @throws TransientException parsing the {@link Workflow} object fails.
     */
    public getWorkflow(workflowId: string, includeTasks: boolean): Workflow {
      return this.getWorkflowModelFromDataStore(workflowId, includeTasks).toWorkflow();
    }
  
    private getWorkflowModelFromDataStore(
      workflowId: string,
      includeTasks: boolean
    ): WorkflowModel {
      let workflow: WorkflowModel = this.executionDAO.getWorkflow(workflowId, includeTasks);
      if (workflow === null) {
        ExecutionDAOFacade.LOGGER.debug(
          "Workflow {} not found in executionDAO, checking indexDAO",
          workflowId
        );
        const json: string = this.indexDAO.get(workflowId, ExecutionDAOFacade.RAW_JSON_FIELD);
        if (json === null) {
          const errorMsg: string = `No such workflow found by id: ${workflowId}`;
          ExecutionDAOFacade.LOGGER.error(errorMsg);
          throw new NotFoundException(errorMsg);
        }
  
        try {
          workflow = this.objectMapper.readValue(json, WorkflowModel.class);
          if (!includeTasks) {
            workflow.getTasks().clear();
          }
        } catch (e) {
          const errorMsg: string = `Error reading workflow: ${workflowId}`;
          ExecutionDAOFacade.LOGGER.error(errorMsg);
          throw new TransientException(errorMsg, e);
        }
      }
      return workflow;
    }
  
    /**
     * Retrieve all workflow executions with the given correlationId and workflow type Uses the
     * {@link IndexDAO} to search across workflows if the {@link ExecutionDAO} cannot perform
     * searches across workflows.
     *
     * @param workflowName, workflow type to be queried
     * @param correlationId the correlation id to be queried
     * @param includeTasks if true, fetches the {@link Task} data within the workflows
     * @return the list of {@link Workflow} executions matching the correlationId
     */
    public getWorkflowsByCorrelationId(
      workflowName: string,
      correlationId: string,
      includeTasks: boolean
    ): List<Workflow> {
      if (!this.executionDAO.canSearchAcrossWorkflows()) {
        const query: string = `correlationId='${correlationId}' AND workflowType='${workflowName}'`;
        const result: SearchResult<string> = this.indexDAO.searchWorkflows(
          query,
          "*",
          0,
          1000,
          null
        );
        return result.getResults().stream()
          .parallel()
          .map(workflowId => {
            try {
              return this.getWorkflow(workflowId, includeTasks);
            } catch (e) {
              ExecutionDAOFacade.LOGGER.error(
                `Error getting the workflow: ${workflowId} for correlationId: ${correlationId} from datastore/index`,
                e
              );
              return null;
            }
          })
          .filter(Objects::nonNull)
          .collect(Collectors.toList());
      }
      return this.executionDAO.getWorkflowsByCorrelationId(workflowName, correlationId, includeTasks)
        .stream()
        .map(WorkflowModel::toWorkflow)
        .collect(Collectors.toList());
    }
  
    public getWorkflowsByName(
      workflowName: string,
      startTime: number,
      endTime: number
    ): List<Workflow> {
      return this.executionDAO.getWorkflowsByType(workflowName, startTime, endTime).stream()
        .map(WorkflowModel::toWorkflow)
        .collect(Collectors.toList());
    }
  
    public getPendingWorkflowsByName(workflowName: string, version: number): List<Workflow> {
      return this.executionDAO.getPendingWorkflowsByType(workflowName, version).stream()
        .map(WorkflowModel::toWorkflow)
        .collect(Collectors.toList());
    }
  
    public getRunningWorkflowIds(workflowName: string, version: number): List<string> {
      return this.executionDAO.getRunningWorkflowIds(workflowName, version);
    }
  
    public getPendingWorkflowCount(workflowName: string): number {
      return this.executionDAO.getPendingWorkflowCount(workflowName);
    }
  
    /**
     * Creates a new workflow in the data store
     *
     * @param workflowModel the workflow to be created
     * @return the id of the created workflow
     */
    public createWorkflow(workflowModel: WorkflowModel): string {
      this.externalizeWorkflowData(workflowModel);
      this.executionDAO.createWorkflow(workflowModel);
      // Add to decider queue
      this.queueDAO.push(
        DECIDER_QUEUE,
        workflowModel.getWorkflowId(),
        workflowModel.getPriority(),
        this.properties.getWorkflowOffsetTimeout().getSeconds()
      );
      if (this.properties.isAsyncIndexingEnabled()) {
        this.indexDAO.asyncIndexWorkflow(new WorkflowSummary(workflowModel.toWorkflow()));
      } else {
        this.indexDAO.indexWorkflow(new WorkflowSummary(workflowModel.toWorkflow()));
      }
      return workflowModel.getWorkflowId();
    }
  
    private externalizeTaskData(taskModel: TaskModel): void {
      this.externalPayloadStorageUtils.verifyAndUpload(
        taskModel,
        ExternalPayloadStorage.PayloadType.TASK_INPUT
      );
      this.externalPayloadStorageUtils.verifyAndUpload(
        taskModel,
        ExternalPayloadStorage.PayloadType.TASK_OUTPUT
      );
    }
  
    private externalizeWorkflowData(workflowModel: WorkflowModel): void {
      this.externalPayloadStorageUtils.verifyAndUpload(
        workflowModel,
        ExternalPayloadStorage.PayloadType.WORKFLOW_INPUT
      );
      this.externalPayloadStorageUtils.verifyAndUpload(
        workflowModel,
        ExternalPayloadStorage.PayloadType.WORKFLOW_OUTPUT
      );
    }
  
    /**
     * Updates the given workflow in the data store
     *
     * @param workflowModel the workflow tp be updated
     * @return the id of the updated workflow
     */
    public updateWorkflow(workflowModel: WorkflowModel): string {
      workflowModel.setUpdatedTime(Date.now());
      if (workflowModel.getStatus().isTerminal()) {
        workflowModel.setEndTime(Date.now());
      }
      this.externalizeWorkflowData(workflowModel);
      this.executionDAO.updateWorkflow(workflowModel);
      if (this.properties.isAsyncIndexingEnabled()) {
        if (
          workflowModel.getStatus().isTerminal() &&
          workflowModel.getEndTime() - workflowModel.getCreateTime() <
            this.properties.getAsyncUpdateShortRunningWorkflowDuration().toMillis()
        ) {
          const workflowId: string = workflowModel.getWorkflowId();
          const delayWorkflowUpdate: DelayWorkflowUpdate = new DelayWorkflowUpdate(workflowId);
          ExecutionDAOFacade.LOGGER.debug(
            "Delayed updating workflow: {} in the index by {} seconds",
            workflowId,
            this.properties.getAsyncUpdateDelay()
          );
          this.scheduledThreadPoolExecutor.schedule(
            delayWorkflowUpdate,
            this.properties.getAsyncUpdateDelay().getSeconds(),
            TimeUnit.SECONDS
          );
          Monitors.recordWorkerQueueSize("delayQueue", this.scheduledThreadPoolExecutor.getQueue().size());
        } else {
          this.indexDAO.asyncIndexWorkflow(new WorkflowSummary(workflowModel.toWorkflow()));
        }
      } else {
        this.indexDAO.indexWorkflow(new WorkflowSummary(workflowModel.toWorkflow()));
      }
      return workflowModel.getWorkflowId();
    }
  
    public getTask(taskId: string): Task {
      return this.executionDAO.getTask(taskId);
    }
  
    /**
     * Retrieve the task with the given task ID.
     *
     * @param taskId the task ID
     * @return the task
     */
    public getTaskById(taskId: string): TaskModel {
      const task: TaskModel = this.executionDAO.getTaskById(taskId);
      if (task === null) {
        const errorMsg: string = `No such task found by id: ${taskId}`;
        ExecutionDAOFacade.LOGGER.error(errorMsg);
        throw new NotFoundException(errorMsg);
      }
      this.populateTaskPayloadData(task);
      return task;
    }
  
    public getTasksForWorkflow(
      workflowId: string,
      includeClosed: boolean,
      includeTasks: boolean,
      excludeSystemTasks: boolean
    ): List<Task> {
      return this.executionDAO.getTasksForWorkflow(
        workflowId,
        includeClosed,
        includeTasks,
        excludeSystemTasks
      );
    }
  
    public getTasksForWorkflowByStatus(
      workflowId: string,
      taskStatuses: List<Task.Status>,
      includeTasks: boolean,
      excludeSystemTasks: boolean
    ): List<Task> {
      return this.executionDAO.getTasksForWorkflowByStatus(
        workflowId,
        taskStatuses,
        includeTasks,
        excludeSystemTasks
      );
    }
  
    public createTask(taskModel: TaskModel): string {
      this.externalizeTaskData(taskModel);
      this.executionDAO.createTask(taskModel);
      // Add to task queue
      this.queueDAO.push(
        TASK_QUEUE_PREFIX + taskModel.getTaskDefName(),
        taskModel.getTaskId(),
        taskModel.getPriority(),
        this.properties.getWorkflowOffsetTimeout().getSeconds()
      );
      return taskModel.getTaskId();
    }
  
    public updateTask(taskModel: TaskModel): string {
      taskModel.setUpdateTime(Date.now());
      this.externalizeTaskData(taskModel);
      this.executionDAO.updateTask(taskModel);
      return taskModel.getTaskId();
    }
  
    public removeTask(taskId: string): void {
      this.executionDAO.removeTask(taskId);
    }
  
    /**
     * Updates the workflow's task's status for the given task ID in the data store
     *
     * @param taskId the task ID of the task to be updated
     * @param status the status to be updated to
     * @return the ID of the updated task
     */
    public updateTaskStatus(taskId: string, status: Task.Status): string {
      const task: TaskModel = this.getTaskById(taskId);
      task.setStatus(status);
      task.setUpdateTime(Date.now());
      this.externalizeTaskData(task);
      this.executionDAO.updateTask(task);
      return task.getTaskId();
    }
  
    /**
     * Updates the workflow's task's output for the given task ID in the data store
     *
     * @param taskId the task ID of the task to be updated
     * @param output the output to be updated to
     * @return the ID of the updated task
     */
    public updateTaskOutput(taskId: string, output: any): string {
      const task: TaskModel = this.getTaskById(taskId);
      task.setOutputData(output);
      task.setUpdateTime(Date.now());
      this.externalizeTaskData(task);
      this.executionDAO.updateTask(task);
      return task.getTaskId();
    }
  
    /**
     * Updates the workflow's task's callbackAfterSeconds field for the given task ID in the data store
     *
     * @param taskId the task ID of the task to be updated
     * @param callbackAfterSeconds the callbackAfterSeconds to be updated to
     * @return the ID of the updated task
     */
    public updateTaskCallbackAfterSeconds(taskId: string, callbackAfterSeconds: number): string {
      const task: TaskModel = this.getTaskById(taskId);
      task.setCallbackAfterSeconds(callbackAfterSeconds);
      task.setUpdateTime(Date.now());
      this.externalizeTaskData(task);
      this.executionDAO.updateTask(task);
      return task.getTaskId();
    }
  
    /**
     * Updates the workflow's task's workerId field for the given task ID in the data store
     *
     * @param taskId the task ID of the task to be updated
     * @param workerId the workerId to be updated to
     * @return the ID of the updated task
     */
    public updateTaskWorkerId(taskId: string, workerId: string): string {
      const task: TaskModel = this.getTaskById(taskId);
      task.setWorkerId(workerId);
      task.setUpdateTime(Date.now());
      this.externalizeTaskData(task);
      this.executionDAO.updateTask(task);
      return task.getTaskId();
    }
  
    /**
     * Updates the workflow's task's status and workerId fields for the given task ID in the data store
     *
     * @param taskId the task ID of the task to be updated
     * @param status the status to be updated to
     * @param workerId the workerId to be updated to
     * @return the ID of the updated task
     */
    public updateTaskStatusAndWorkerId(
      taskId: string,
      status: Task.Status,
      workerId: string
    ): string {
      const task: TaskModel = this.getTaskById(taskId);
      task.setStatus(status);
      task.setWorkerId(workerId);
      task.setUpdateTime(Date.now());
      this.externalizeTaskData(task);
      this.executionDAO.updateTask(task);
      return task.getTaskId();
    }
  
    /**
     * Updates the workflow's task's status and output fields for the given task ID in the data store
     *
     * @param taskId the task ID of the task to be updated
     * @param status the status to be updated to
     * @param output the output to be updated to
     * @return the ID of the updated task
     */
    public updateTaskStatusAndOutput(taskId: string, status: Task.Status, output: any): string {
      const task: TaskModel = this.getTaskById(taskId);
      task.setStatus(status);
      task.setOutputData(output);
      task.setUpdateTime(Date.now());
      this.externalizeTaskData(task);
      this.executionDAO.updateTask(task);
      return task.getTaskId();
    }
  
    /**
     * Retrieves the task's input from the data store and populates the input data in the task model.
     *
     * @param taskModel the task model
     */
    private populateTaskPayloadData(taskModel: TaskModel): void {
      this.externalPayloadStorageUtils.populatePayloadData(
        taskModel,
        ExternalPayloadStorage.PayloadType.TASK_INPUT
      );
      this.externalPayloadStorageUtils.populatePayloadData(
        taskModel,
        ExternalPayloadStorage.PayloadType.TASK_OUTPUT
      );
    }
  
    public getWorkflowDefs(): List<WorkflowDef> {
      return this.executionDAO.getWorkflowDefs();
    }
  
    public getWorkflowDef(name: string, version: number): WorkflowDef {
      const workflowDef: WorkflowDef = this.executionDAO.getWorkflowDef(name, version);
      if (workflowDef === null) {
        const errorMsg: string = `No such workflow found with name: ${name} and version: ${version}`;
        ExecutionDAOFacade.LOGGER.error(errorMsg);
        throw new NotFoundException(errorMsg);
      }
      return workflowDef;
    }
  
    public createWorkflowDef(workflowDef: WorkflowDef): void {
      this.executionDAO.createWorkflowDef(workflowDef);
    }
  
    public updateWorkflowDef(workflowDef: WorkflowDef): void {
      this.executionDAO.updateWorkflowDef(workflowDef);
    }
  
    public removeWorkflowDef(name: string, version: number): void {
      this.executionDAO.removeWorkflowDef(name, version);
    }
  
    public getTaskDefs(): List<TaskDef> {
      return this.executionDAO.getTaskDefs();
    }
  
    public getTaskDef(name: string): TaskDef {
      const taskDef: TaskDef = this.executionDAO.getTaskDef(name);
      if (taskDef === null) {
        const errorMsg: string = `No such task definition found with name: ${name}`;
        ExecutionDAOFacade.LOGGER.error(errorMsg);
        throw new NotFoundException(errorMsg);
      }
      return taskDef;
    }
  
    public createTaskDef(taskDef: TaskDef): void {
      this.executionDAO.createTaskDef(taskDef);
    }
  
    public updateTaskDef(taskDef: TaskDef): void {
      this.executionDAO.updateTaskDef(taskDef);
    }
  
    public removeTaskDef(name: string): void {
      this.executionDAO.removeTaskDef(name);
    }
  
    public shutdown(): void {
      this.executionDAO.shutdown();
      this.indexDAO.shutdown();
      this.scheduledThreadPoolExecutor.shutdown();
    }
  }
  
  class DelayWorkflowUpdate implements Runnable {
    private readonly workflowId: string;
  
    constructor(workflowId: string) {
      this.workflowId = workflowId;
    }
  
    run(): void {
      try {
        ExecutionDAOFacade.LOGGER.debug("Processing delayed workflow update: {}", this.workflowId);
        const executionDAOFacade: ExecutionDAOFacade = new ExecutionDAOFacade();
        const workflowModel: WorkflowModel = executionDAOFacade.getWorkflowById(this.workflowId);
        if (workflowModel !== null) {
          executionDAOFacade.externalizeWorkflowData(workflowModel);
          executionDAOFacade.executionDAO.updateWorkflow(workflowModel);
        } else {
          ExecutionDAOFacade.LOGGER.warn(
            "Unable to find workflow with id: {} for delayed update",
            this.workflowId
          );
        }
      } catch (ex) {
        ExecutionDAOFacade.LOGGER.error("Error processing delayed workflow update", ex);
      }
    }
  }
  
  export = ExecutionDAOFacade;
  