import { TaskStatus } from '../../../common/metadata/tasks/Task'
import { TaskDef } from '../../../common/metadata/tasks/TaskDef'
import { TASK_TYPE_DO_WHILE } from '../../../common/metadata/tasks/TaskType'
import { WorkflowTask } from '../../../common/metadata/workflow/WorkflowTask'
import { TaskUtils } from '../../../common/utils/TaskUtils'
import { LOGGER } from '../../dal/ExecutionDAOFacade'
import { ScriptEvaluator } from '../../events/ScriptEvaluator'
import { WorkflowModel } from '../../model/WorkflowModel'
import { WorkflowExecutor } from '../WorkflowExecutor'

export class DoWhile extends WorkflowSystemTask {
  private parametersUtils: ParametersUtils

  constructor (parametersUtils: ParametersUtils) {
    super(TASK_TYPE_DO_WHILE)
    this.parametersUtils = parametersUtils
  }

  cancel (
    workflow: WorkflowModel,
    task: TaskModel,
    executor: WorkflowExecutor
  ): void {
    task.setStatus(TaskStatus.CANCELED)
  }

  execute (
    workflow: WorkflowModel,
    doWhileTaskModel: TaskModel,
    workflowExecutor: WorkflowExecutor
  ): boolean {
    let hasFailures: boolean = false
    let failureReason: string = ''
    let output: Record<string, any> = {}

    /*
     * Get the latest set of tasks (the ones that have the highest retry count). We don't want to evaluate any tasks
     * that have already failed if there is a more current one (a later retry count).
     */
    let relevantTasks: Map<string, TaskModel> = new Map<string, TaskModel>()
    let relevantTask: TaskModel
    for (let t of workflow.getTasks()) {
      if (
        doWhileTaskModel
          .getWorkflowTask()
          .has(
            TaskUtils.removeIterationFromTaskRefName(t.getReferenceTaskName())
          ) &&
        !doWhileTaskModel
          .getReferenceTaskName()
          .equals(t.getReferenceTaskName()) &&
        doWhileTaskModel.getIteration() == t.getIteration()
      ) {
        relevantTask = relevantTasks.get(t.getReferenceTaskName())
        if (
          relevantTask == null ||
          t.getRetryCount() > relevantTask.getRetryCount()
        ) {
          relevantTasks.set(t.getReferenceTaskName(), t)
        }
      }
    }
    let loopOverTasks: TaskModel[] = Array.from(relevantTasks.values())

    if (LOGGER.isDebugEnabled()) {
      LOGGER.debug(
        `Workflow ${workflow.getWorkflowId()} waiting for tasks ${loopOverTasks.map(
          t => t.getReferenceTaskName()
        )} to complete iteration ${doWhileTaskModel.getIteration()}`
      )
    }

    // if the loopOverTasks collection is empty, no tasks inside the loop have been scheduled.
    // so schedule it and exit the method.
    if (loopOverTasks.length === 0) {
      doWhileTaskModel.setIteration(1)
      doWhileTaskModel.addOutput('iteration', doWhileTaskModel.getIteration())
      return scheduleNextIteration(doWhileTaskModel, workflow, workflowExecutor)
    }

    for (let loopOverTask of loopOverTasks) {
      let taskStatus: TaskStatus = loopOverTask.getStatus()
      hasFailures = !taskStatus.isSuccessful()
      if (hasFailures) {
        failureReason += loopOverTask.getReasonForIncompletion() + ' '
      }
      output[
        TaskUtils.removeIterationFromTaskRefName(
          loopOverTask.getReferenceTaskName()
        )
      ] = loopOverTask.getOutputData()
      if (hasFailures) {
        break
      }
    }
    doWhileTaskModel.addOutput(
      doWhileTaskModel.getIteration().toString(),
      output
    )

    if (hasFailures) {
      LOGGER.debug(
        `Task ${doWhileTaskModel.getTaskId()} failed in ${
          doWhileTaskModel.getIteration() + 1
        } iteration`
      )
      return markTaskFailure(doWhileTaskModel, TaskStatus.FAILED, failureReason)
    }

    if (!isIterationComplete(doWhileTaskModel, relevantTasks)) {
      // current iteration is not complete (all tasks inside the loop are not terminal)
      return false
    }

    // if we are here, the iteration is complete, and we need to check if there is a next
    // iteration by evaluating the loopCondition
    let shouldContinue: boolean
    try {
      shouldContinue = evaluateCondition(workflow, doWhileTaskModel)
      LOGGER.debug(
        `Task ${doWhileTaskModel.getTaskId()} condition evaluated to ${shouldContinue}`
      )
      if (shouldContinue) {
        doWhileTaskModel.setIteration(doWhileTaskModel.getIteration() + 1)
        doWhileTaskModel.addOutput('iteration', doWhileTaskModel.getIteration())
        return scheduleNextIteration(
          doWhileTaskModel,
          workflow,
          workflowExecutor
        )
      } else {
        LOGGER.debug(
          `Task ${doWhileTaskModel.getTaskId()} took ${
            doWhileTaskModel.getIteration() + 1
          } iterations to complete`
        )
        return markTaskSuccess(doWhileTaskModel)
      }
    } catch (e) {
      let message = `Unable to evaluate condition ${doWhileTaskModel
        .getWorkflowTask()
        .getLoopCondition()}, exception ${e.getMessage()}`
      LOGGER.error(message)
      return markTaskFailure(
        doWhileTaskModel,
        TaskStatus.FAILED_WITH_TERMINAL_ERROR,
        message
      )
    }
  }

  /**
   * Check if all tasks in the current iteration have reached terminal state.
   *
   * @param doWhileTaskModel The {@link TaskModel} of DO_WHILE.
   * @param referenceNameToModel Map of taskReferenceName to {@link TaskModel}.
   * @return true if all tasks in DO_WHILE.loopOver are in <code>referenceNameToModel</code> and reached terminal state.
   */
  private isIterationComplete (
    doWhileTaskModel: TaskModel,
    referenceNameToModel: Map<string, TaskModel>
  ): boolean {
    let workflowTasksInsideDoWhile: WorkflowTask[] = doWhileTaskModel
      .getWorkflowTask()
      .getLoopOver()
    let iteration: number = doWhileTaskModel.getIteration()
    let allTasksTerminal: boolean = true
    for (let workflowTaskInsideDoWhile of workflowTasksInsideDoWhile) {
      let taskReferenceName: string = TaskUtils.appendIteration(
        workflowTaskInsideDoWhile.getTaskReferenceName(),
        iteration
      )
      if (referenceNameToModel.has(taskReferenceName)) {
        let taskModel: TaskModel = referenceNameToModel.get(taskReferenceName)
        if (!taskModel.getStatus().isTerminal()) {
          allTasksTerminal = false
          break
        }
      } else {
        allTasksTerminal = false
        break
      }
    }

    if (!allTasksTerminal) {
      // Cases where tasks directly inside loop over are not completed.
      // loopOver -> [task1 -> COMPLETED, task2 -> IN_PROGRESS]
      return false
    }

    // Check all the tasks in referenceNameToModel are completed or not. These are set of tasks
    // which are not directly inside loopOver tasks, but they are under hierarchy
    // loopOver -> [decisionTask -> COMPLETED [ task1 -> COMPLETED, task2 -> IN_PROGRESS]]
    return Array.from(referenceNameToModel.values()).every(taskModel =>
      taskModel.getStatus().isTerminal()
    )
  }

  private scheduleNextIteration (
    doWhileTaskModel: TaskModel,
    workflow: WorkflowModel,
    workflowExecutor: WorkflowExecutor
  ): boolean {
    LOGGER.debug(
      `Scheduling loop tasks for task ${doWhileTaskModel.getTaskId()} as condition ${doWhileTaskModel
        .getWorkflowTask()
        .getLoopCondition()} evaluated to true`
    )
    workflowExecutor.scheduleNextIteration(doWhileTaskModel, workflow)
    return true // Return true even though status not changed. Iteration has to be updated in execution DAO.
  }

  private markTaskFailure (
    taskModel: TaskModel,
    status: TaskStatus,
    failureReason: string
  ): boolean {
    LOGGER.error(`Marking task ${taskModel.getTaskId()} failed with error.`)
    taskModel.setReasonForIncompletion(failureReason)
    taskModel.setStatus(status)
    return true
  }

  private markTaskSuccess (taskModel: TaskModel): boolean {
    LOGGER.debug(
      `Task ${taskModel.getTaskId()} took ${
        taskModel.getIteration() + 1
      } iterations to complete`
    )
    taskModel.setStatus(TaskStatus.COMPLETED)
    return true
  }

  private evaluateCondition (workflow: WorkflowModel, task: TaskModel): boolean {
    let taskDefinition: TaskDef = task.getTaskDefinition().orElse(null)
    // Use paramUtils to compute the task input
    let conditionInput: Record<string, any> = parametersUtils.getTaskInputV2(
      task.getWorkflowTask().getInputParameters(),
      workflow,
      task.getTaskId(),
      taskDefinition
    )
    conditionInput[task.getReferenceTaskName()] = task.getOutputData()
    let loopOver: TaskModel[] = workflow
      .getTasks()
      .filter(
        t =>
          task
            .getWorkflowTask()
            .has(
              TaskUtils.removeIterationFromTaskRefName(t.getReferenceTaskName())
            ) && !task.getReferenceTaskName().equals(t.getReferenceTaskName())
      )

    for (let loopOverTask of loopOver) {
      conditionInput[
        TaskUtils.removeIterationFromTaskRefName(
          loopOverTask.getReferenceTaskName()
        )
      ] = loopOverTask.getOutputData()
    }

    let condition: string = task.getWorkflowTask().getLoopCondition()
    let result: boolean = false
    if (condition != null) {
      LOGGER.debug(`Condition: ${condition} is being evaluated`)
      // Evaluate the expression by using the Nashorn based script evaluator
      result = ScriptEvaluator.evalBool(condition, conditionInput)
    }
    return result
  }
}
