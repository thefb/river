import { Logger } from "pino"
import { TaskDef } from "../../common/metadata/tasks/TaskDef"
import { SubWorkflowParams } from "../../common/metadata/workflow/SubWorkflowParams"
import { WorkflowDef, TaskType } from "../../common/metadata/workflow/WorkflowDef"
import { WorkflowTask } from "../../common/metadata/workflow/WorkflowTask"
import { WorkflowContext } from "../WorkflowContext"
import { NotFoundException } from "../exception/NotFoundException"
import { TerminateWorkflowException } from "../exception/TerminateWorkflowException"
import { WorkflowModel } from "../model/WorkflowModel"

export class MetadataMapperService {
  private static readonly LOGGER: Logger = LoggerFactory.getLogger(
    MetadataMapperService
  )
  private readonly metadataDAO: MetadataDAO

  constructor (metadataDAO: MetadataDAO) {
    this.metadataDAO = metadataDAO
  }

  lookupForWorkflowDefinition (
    name: string,
    version: number | null
  ): WorkflowDef {
    const potentialDef: WorkflowDef | undefined =
      version == null
        ? this.lookupLatestWorkflowDefinition(name)
        : this.lookupWorkflowDefinition(name, version)

    if (potentialDef === undefined) {
      MetadataMapperService.LOGGER.error(
        `There is no workflow defined with name ${name} and version ${version}`
      )
      throw new NotFoundException(
        `No such workflow defined. name=${name}, version=${version}`
      )
    }

    return potentialDef
  }

  private lookupWorkflowDefinition (
    workflowName: string,
    workflowVersion: number
  ): WorkflowDef | undefined {
    Utils.checkArgument(
      workflowName.trim() !== '',
      'Workflow name must be specified when searching for a definition'
    )
    return this.metadataDAO.getWorkflowDef(workflowName, workflowVersion)
  }

  private lookupLatestWorkflowDefinition (
    workflowName: string
  ): WorkflowDef | undefined {
    Utils.checkArgument(
      workflowName.trim() !== '',
      'Workflow name must be specified when searching for a definition'
    )
    return this.metadataDAO.getLatestWorkflowDef(workflowName)
  }

  populateWorkflowWithDefinitions (workflow: WorkflowModel): WorkflowModel {
    Utils.checkNotNull(workflow, 'workflow cannot be null')
    const workflowDefinition: WorkflowDef =
      workflow.getWorkflowDefinition() ??
      this.lookupForWorkflowDefinition(
        workflow.getWorkflowName(),
        workflow.getWorkflowVersion()
      )
    workflow.setWorkflowDefinition(workflowDefinition)

    workflowDefinition.collectTasks().forEach(workflowTask => {
      this.populateWorkflowTaskWithDefinition(workflowTask)
    })

    this.checkNotEmptyDefinitions(workflowDefinition)

    return workflow
  }

  populateTaskDefinitions (workflowDefinition: WorkflowDef): WorkflowDef {
    Utils.checkNotNull(workflowDefinition, 'workflowDefinition cannot be null')
    workflowDefinition.collectTasks().forEach(workflowTask => {
      this.populateWorkflowTaskWithDefinition(workflowTask)
    })
    this.checkNotEmptyDefinitions(workflowDefinition)
    return workflowDefinition
  }

  private populateWorkflowTaskWithDefinition (workflowTask: WorkflowTask): void {
    Utils.checkNotNull(workflowTask, 'WorkflowTask cannot be null')

    if (this.shouldPopulateTaskDefinition(workflowTask)) {
      workflowTask.setTaskDefinition(
        this.metadataDAO.getTaskDef(workflowTask.getName())
      )

      if (
        workflowTask.getTaskDefinition() === null &&
        workflowTask.getType() === TaskType.SIMPLE
      ) {
        // ad-hoc task def
        workflowTask.setTaskDefinition(new TaskDef(workflowTask.getName()))
      }
    }

    if (workflowTask.getType() === TaskType.SUB_WORKFLOW) {
      this.populateVersionForSubWorkflow(workflowTask)
    }
  }

  private populateVersionForSubWorkflow (workflowTask: WorkflowTask): void {
    Utils.checkNotNull(workflowTask, 'WorkflowTask cannot be null')

    const subworkflowParams: SubWorkflowParams =
      workflowTask.getSubWorkflowParam()
    if (subworkflowParams.getVersion() === null) {
      const subWorkflowName: string = subworkflowParams.getName()

      const subWorkflowVersion: number | undefined = this.metadataDAO
        .getLatestWorkflowDef(subWorkflowName)
        .map(workflowDef => workflowDef.getVersion())
        .orElseThrow(() => {
          const reason = `The Task ${subWorkflowName} defined as a sub-workflow has no workflow definition available`
          MetadataMapperService.LOGGER.error(reason)
          return new TerminateWorkflowException(reason)
        })

      subworkflowParams.setVersion(subWorkflowVersion)
    }
  }

  private checkNotEmptyDefinitions (workflowDefinition: WorkflowDef): void {
    Utils.checkNotNull(workflowDefinition, 'WorkflowDefinition cannot be null')

    const missingTaskDefinitionNames: string[] = workflowDefinition
      .collectTasks()
      .filter(workflowTask => workflowTask.getType() === TaskType.SIMPLE)
      .filter(workflowTask => this.shouldPopulateTaskDefinition(workflowTask))
      .map(workflowTask => workflowTask.getName())

    if (missingTaskDefinitionNames.length > 0) {
      MetadataMapperService.LOGGER.error(
        'Cannot find the task definitions for the following tasks used in workflow: {}',
        missingTaskDefinitionNames
      )
      Monitors.recordWorkflowStartError(
        workflowDefinition.getName(),
        WorkflowContext.get().getClientApp()
      )
      throw new IllegalArgumentException(
        'Cannot find the task definitions for the following tasks used in workflow: ' +
          missingTaskDefinitionNames.join(', ')
      )
    }
  }

  populateTaskWithDefinition (task: TaskModel): TaskModel {
    Utils.checkNotNull(task, 'Task cannot be null')
    this.populateWorkflowTaskWithDefinition(task.getWorkflowTask())
    return task
  }

  private shouldPopulateTaskDefinition (workflowTask: WorkflowTask): boolean {
    Utils.checkNotNull(workflowTask, 'WorkflowTask cannot be null')
    Utils.checkNotNull(
      workflowTask.getType(),
      'WorkflowTask type cannot be null'
    )
    return (
      workflowTask.getTaskDefinition() === null &&
      workflowTask.getName().trim() !== ''
    )
  }
}
