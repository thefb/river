import { Task, TaskStatus } from '../../../common/metadata/tasks/Task'
import { TaskType } from '../../../common/metadata/workflow/WorkflowDef'
import { WorkflowExecutor } from '../WorkflowExecutor'

export class Decision extends WorkflowSystemTask {
  constructor () {
    super(TaskType.DECISION)
  }

  execute (
    workflow: Workflow,
    task: Task,
    workflowExecutor: WorkflowExecutor
  ): boolean {
    task.setStatus(TaskStatus.COMPLETED)
    return true
  }
}
