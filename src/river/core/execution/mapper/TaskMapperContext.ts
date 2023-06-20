import { TaskDef } from '../../../common/metadata/tasks/TaskDef'
import { WorkflowDef } from '../../../common/metadata/workflow/WorkflowDef'
import { WorkflowTask } from '../../../common/metadata/workflow/WorkflowTask'
import { WorkflowModel } from '../../model/WorkflowModel'
import { DeciderService } from '../DeciderService'

interface TaskMapperContextBuilder {
  workflowModel: WorkflowModel
  taskDefinition: TaskDef
  workflowTask: WorkflowTask
  taskInput: Record<string, any>
  retryCount: number
  retryTaskId: string
  taskId: string
  deciderService: DeciderService
}

class TaskMapperContext {
  private readonly workflowModel: WorkflowModel
  private readonly taskDefinition: TaskDef
  private readonly workflowTask: WorkflowTask
  private readonly taskInput: Record<string, any>
  private readonly retryCount: number
  private readonly retryTaskId: string
  private readonly taskId: string
  private readonly deciderService: DeciderService

  private constructor (builder: TaskMapperContextBuilder) {
    this.workflowModel = builder.workflowModel
    this.taskDefinition = builder.taskDefinition
    this.workflowTask = builder.workflowTask
    this.taskInput = builder.taskInput
    this.retryCount = builder.retryCount
    this.retryTaskId = builder.retryTaskId
    this.taskId = builder.taskId
    this.deciderService = builder.deciderService
  }

  public static newBuilder (): TaskMapperContextBuilder {
    return {} as TaskMapperContextBuilder
  }

  public static newBuilder (copy: TaskMapperContext): TaskMapperContextBuilder {
    return {
      workflowModel: copy.getWorkflowModel(),
      taskDefinition: copy.getTaskDefinition(),
      workflowTask: copy.getWorkflowTask(),
      taskInput: copy.getTaskInput(),
      retryCount: copy.getRetryCount(),
      retryTaskId: copy.getRetryTaskId(),
      taskId: copy.getTaskId(),
      deciderService: copy.getDeciderService()
    }
  }

  public createTaskModel (): TaskModel {
    const taskModel: TaskModel = new TaskModel()
    taskModel.setReferenceTaskName(this.workflowTask.getTaskReferenceName())
    taskModel.setWorkflowInstanceId(this.workflowModel.getWorkflowId())
    taskModel.setWorkflowType(this.workflowModel.getWorkflowName())
    taskModel.setCorrelationId(this.workflowModel.getCorrelationId())
    taskModel.setScheduledTime(Date.now())

    taskModel.setTaskId(this.taskId)
    taskModel.setWorkflowTask(this.workflowTask)
    taskModel.setWorkflowPriority(this.workflowModel.getPriority())

    // the following properties are overridden by some TaskMapper implementations
    taskModel.setTaskType(this.workflowTask.getType())
    taskModel.setTaskDefName(this.workflowTask.getName())
    return taskModel
  }

  public toString (): string {
    return `TaskMapperContext{workflowDefinition=${this.getWorkflowDefinition()}, workflowModel=${
      this.workflowModel
    }, workflowTask=${this.workflowTask}, taskInput=${
      this.taskInput
    }, retryCount=${this.retryCount}, retryTaskId='${
      this.retryTaskId
    }', taskId='${this.taskId}'}`
  }

  public equals (o: any): boolean {
    if (this === o) {
      return true
    }
    if (!(o instanceof TaskMapperContext)) {
      return false
    }

    const that: TaskMapperContext = o

    if (this.getRetryCount() !== that.getRetryCount()) {
      return false
    }
    if (!this.getWorkflowDefinition().equals(that.getWorkflowDefinition())) {
      return false
    }
    if (!this.getWorkflowModel().equals(that.getWorkflowModel())) {
      return false
    }
    if (!this.getWorkflowTask().equals(that.getWorkflowTask())) {
      return false
    }
    if (!this.getTaskInput().equals(that.getTaskInput())) {
      return false
    }
    if (
      this.getRetryTaskId() !== null
        ? !this.getRetryTaskId().equals(that.getRetryTaskId())
        : that.getRetryTaskId() !== null
    ) {
      return false
    }
    return this.getTaskId().equals(that.getTaskId())
  }

  public hashCode (): number {
    let result: number = this.getWorkflowDefinition().hashCode()
    result = 31 * result + this.getWorkflowModel().hashCode()
    result = 31 * result + this.getWorkflowTask().hashCode()
    result = 31 * result + this.getTaskInput().hashCode()
    result = 31 * result + this.getRetryCount()
    result =
      31 * result +
      (this.getRetryTaskId() !== null ? this.getRetryTaskId().hashCode() : 0)
    result = 31 * result + this.getTaskId().hashCode()
    return result
  }
}

export default TaskMapperContext
