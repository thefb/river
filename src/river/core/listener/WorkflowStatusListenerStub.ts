import { Logger } from 'pino'
import { WorkflowModel } from '../model/WorkflowModel'
import { WorkflowStatusListener } from './WorkflowStatusListener'

export class WorkflowStatusListenerStub implements WorkflowStatusListener {
  private static readonly LOGGER: Logger = LoggerFactory.getLogger(
    WorkflowStatusListenerStub
  )

  onWorkflowCompleted (workflow: WorkflowModel): void {
    WorkflowStatusListenerStub.LOGGER.debug(
      `Workflow ${workflow.getWorkflowId()} is completed`
    )
  }

  onWorkflowTerminated (workflow: WorkflowModel): void {
    WorkflowStatusListenerStub.LOGGER.debug(
      `Workflow ${workflow.getWorkflowId()} is terminated`
    )
  }

  onWorkflowFinalized (workflow: WorkflowModel): void {
    WorkflowStatusListenerStub.LOGGER.debug(
      `Workflow ${workflow.getWorkflowId()} is finalized`
    )
  }
}
