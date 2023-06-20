import { TaskType } from '../../common/metadata/workflow/WorkflowDef'
import { ConductorProperties } from '../config/ConductorProperties'
import { LOGGER } from '../dal/ExecutionDAOFacade'
import { SystemTaskRegistry } from '../execution/tasks/SystemTaskRegistry'
import { WorkflowModel } from '../model/WorkflowModel'

export class WorkflowRepairService {
  private static readonly LOGGER = LoggerFactory.getLogger(
    WorkflowRepairService
  )
  private readonly executionDAO: ExecutionDAO
  private readonly queueDAO: QueueDAO
  private readonly properties: ConductorProperties
  private systemTaskRegistry: SystemTaskRegistry

  private readonly isTaskRepairable = (task: TaskModel): boolean => {
    if (this.systemTaskRegistry.isSystemTask(task.getTaskType())) {
      const workflowSystemTask = this.systemTaskRegistry.get(task.getTaskType())
      return (
        workflowSystemTask.isAsync() &&
        (!workflowSystemTask.isAsyncComplete(task) ||
          (workflowSystemTask.isAsyncComplete(task) &&
            task.getStatus() === TaskModel.Status.SCHEDULED)) &&
        (task.getStatus() === TaskModel.Status.IN_PROGRESS ||
          task.getStatus() === TaskModel.Status.SCHEDULED)
      )
    } else {
      return task.getStatus() === TaskModel.Status.SCHEDULED
    }
  }

  constructor (
    executionDAO: ExecutionDAO,
    queueDAO: QueueDAO,
    properties: ConductorProperties,
    systemTaskRegistry: SystemTaskRegistry
  ) {
    this.executionDAO = executionDAO
    this.queueDAO = queueDAO
    this.properties = properties
    this.systemTaskRegistry = systemTaskRegistry
    LOGGER.info('WorkflowRepairService Initialized')
  }

  public verifyAndRepairWorkflow (
    workflowId: string,
    includeTasks: boolean
  ): boolean {
    const workflow = this.executionDAO.getWorkflow(workflowId, includeTasks)
    const repaired = { value: false }
    repaired.value = this.verifyAndRepairDeciderQueue(workflow)
    if (includeTasks) {
      workflow
        .getTasks()
        .forEach(task => (repaired.value = this.verifyAndRepairTask(task)))
    }
    return repaired.value
  }

  public verifyAndRepairWorkflowTasks (workflowId: string): void {
    const workflow = this.executionDAO.getWorkflow(workflowId, true)
    workflow.getTasks().forEach(task => this.verifyAndRepairTask(task))
    this.verifyAndRepairWorkflow(workflow.getParentWorkflowId())
  }

  private verifyAndRepairDeciderQueue (workflow: WorkflowModel): boolean {
    if (!workflow.getStatus().isTerminal()) {
      return this.verifyAndRepairWorkflow(workflow.getWorkflowId())
    }
    return false
  }

  private verifyAndRepairTask (task: TaskModel): boolean {
    if (this.isTaskRepairable(task)) {
      const taskQueueName = QueueUtils.getQueueName(task)
      if (!this.queueDAO.containsMessage(taskQueueName, task.getTaskId())) {
        this.queueDAO.push(
          taskQueueName,
          task.getTaskId(),
          task.getCallbackAfterSeconds()
        )
        LOGGER.info(
          `Task ${task.getTaskId()} in workflow ${task.getWorkflowInstanceId()} re-queued for repairs`
        )
        Monitors.recordQueueMessageRepushFromRepairService(
          task.getTaskDefName()
        )
        return true
      }
    } else if (
      task.getTaskType() === TaskType.TASK_TYPE_SUB_WORKFLOW &&
      task.getStatus() === TaskModel.Status.IN_PROGRESS
    ) {
      const subWorkflow = this.executionDAO.getWorkflow(
        task.getSubWorkflowId(),
        false
      )
      if (subWorkflow.getStatus().isTerminal()) {
        LOGGER.info(
          `Repairing sub workflow task ${task.getTaskId()} for sub workflow ${task.getSubWorkflowId()} in workflow ${task.getWorkflowInstanceId()}`
        )
        this.repairSubWorkflowTask(task, subWorkflow)
        return true
      }
    }
    return false
  }

  private verifyAndRepairWorkflow (workflowId: string): boolean {
    if (StringUtils.isNotEmpty(workflowId)) {
      const queueName = Utils.DECIDER_QUEUE
      if (!this.queueDAO.containsMessage(queueName, workflowId)) {
        this.queueDAO.push(
          queueName,
          workflowId,
          this.properties.getWorkflowOffsetTimeout().getSeconds()
        )
        LOGGER.info(`Workflow ${workflowId} re-queued for repairs`)
        Monitors.recordQueueMessageRepushFromRepairService(queueName)
        return true
      }
      return false
    }
    return false
  }

  private repairSubWorkflowTask (
    task: TaskModel,
    subWorkflow: WorkflowModel
  ): void {
    switch (subWorkflow.getStatus()) {
      case WorkflowModel.Status.COMPLETED:
        task.setStatus(TaskModel.Status.COMPLETED)
        break
      case WorkflowModel.Status.FAILED:
        task.setStatus(TaskModel.Status.FAILED)
        break
      case WorkflowModel.Status.TERMINATED:
        task.setStatus(TaskModel.Status.CANCELED)
        break
      case WorkflowModel.Status.TIMED_OUT:
        task.setStatus(TaskModel.Status.TIMED_OUT)
        break
    }
    task.addOutput(subWorkflow.getOutput())
    this.executionDAO.updateTask(task)
  }
}
