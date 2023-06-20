import { TaskType } from "../../../common/metadata/workflow/WorkflowDef";

export class JsonJQTransformTaskMapper implements TaskMapper {
  private parametersUtils: ParametersUtils;
  private metadataDAO: MetadataDAO;

  constructor(parametersUtils: ParametersUtils, metadataDAO: MetadataDAO) {
    this.parametersUtils = parametersUtils;
    this.metadataDAO = metadataDAO;
  }

  getTaskType(): string {
    return TaskType.JSON_JQ_TRANSFORM;
  }

  getMappedTasks(taskMapperContext: TaskMapperContext): TaskModel[] {
    console.log(`TaskMapperContext ${taskMapperContext} in JsonJQTransformTaskMapper`);

    const workflowTask = taskMapperContext.getWorkflowTask();
    const workflowModel = taskMapperContext.getWorkflowModel();
    const taskId = taskMapperContext.getTaskId();

    const taskDefinition =
      taskMapperContext.getTaskDefinition() || this.metadataDAO.getTaskDef(workflowTask.getName());

    const taskInput = this.parametersUtils.getTaskInputV2(
      workflowTask.getInputParameters(),
      workflowModel,
      taskId,
      taskDefinition
    );

    const jsonJQTransformTask: TaskModel = {
      startTime: Date.now(),
      inputData: taskInput,
      status: TaskModel.Status.IN_PROGRESS,
    };

    return [jsonJQTransformTask];
  }
}

export default JsonJQTransformTaskMapper;
