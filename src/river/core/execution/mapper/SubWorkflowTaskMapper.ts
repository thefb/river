class SubWorkflowTaskMapper implements TaskMapper {
  private readonly parametersUtils: ParametersUtils
  private readonly metadataDAO: MetadataDAO

  constructor (parametersUtils: ParametersUtils, metadataDAO: MetadataDAO) {
    this.parametersUtils = parametersUtils
    this.metadataDAO = metadataDAO
  }

  getTaskType (): string {
    return TaskType.SUB_WORKFLOW
  }

  getMappedTasks (taskMapperContext: TaskMapperContext): TaskModel[] {
    console.log(
      `TaskMapperContext ${taskMapperContext} in SubWorkflowTaskMapper`
    )
    const workflowTask = taskMapperContext.getWorkflowTask()
    const workflowModel = taskMapperContext.getWorkflowModel()
    const taskId = taskMapperContext.getTaskId()

    // Check if there are sub workflow parameters, if not throw an exception, cannot initiate a
    // sub-workflow without workflow params
    const subWorkflowParams = this.getSubWorkflowParams(workflowTask)

    const resolvedParams = this.getSubWorkflowInputParameters(
      workflowModel,
      subWorkflowParams
    )

    const subWorkflowName = resolvedParams['name'].toString()
    const subWorkflowVersion = this.getSubWorkflowVersion(
      resolvedParams,
      subWorkflowName
    )

    const subWorkflowDefinition = resolvedParams['workflowDefinition']

    let subWorkflowTaskToDomain: Map<string, unknown> | null = null
    const uncheckedTaskToDomain = resolvedParams['taskToDomain']
    if (uncheckedTaskToDomain instanceof Map) {
      subWorkflowTaskToDomain = uncheckedTaskToDomain
    }

    const subWorkflowTask: TaskModel = {
      taskType: TASK_TYPE_SUB_WORKFLOW,
      inputData: {
        subWorkflowName,
        subWorkflowVersion,
        subWorkflowTaskToDomain,
        subWorkflowDefinition,
        workflowInput: taskMapperContext.getTaskInput()
      },
      status: TaskModel.Status.SCHEDULED,
      callbackAfterSeconds: workflowTask.getStartDelay()
    }

    console.log(`SubWorkflowTask ${subWorkflowTask} created to be Scheduled`)
    return [subWorkflowTask]
  }

  private getSubWorkflowParams (workflowTask: WorkflowTask): SubWorkflowParams {
    const subWorkflowParams = workflowTask.getSubWorkflowParam()
    if (!subWorkflowParams) {
      const reason = `Task ${workflowTask.getName()} is defined as sub-workflow and is missing subWorkflowParams. Please check the workflow definition`
      console.error(reason)
      throw new TerminateWorkflowException(reason)
    }
    return subWorkflowParams
  }

  private getSubWorkflowInputParameters (
    workflowModel: WorkflowModel,
    subWorkflowParams: SubWorkflowParams
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {
      name: subWorkflowParams.getName()
    }

    const version = subWorkflowParams.getVersion()
    if (version !== null) {
      params['version'] = version
    }

    const taskToDomain = subWorkflowParams.getTaskToDomain()
    if (taskToDomain !== null) {
      params['taskToDomain'] = taskToDomain
    }

    params = this.parametersUtils.getTaskInputV2(
      params,
      workflowModel,
      null,
      null
    )

    // do not resolve params inside subworkflow definition
    const subWorkflowDefinition = subWorkflowParams.getWorkflowDefinition()
    if (subWorkflowDefinition !== null) {
      params['workflowDefinition'] = subWorkflowDefinition
    }

    return params
  }

  private getSubWorkflowVersion (
    resolvedParams: Record<string, unknown>,
    subWorkflowName: string
  ): number {
    const version = resolvedParams['version']
    if (version !== null) {
      return parseInt(version.toString())
    }

    const latestWorkflowDef =
      this.metadataDAO.getLatestWorkflowDef(subWorkflowName)
    if (!latestWorkflowDef) {
      const reason = `The Task ${subWorkflowName} defined as a sub-workflow has no workflow definition available`
      console.error(reason)
      throw new TerminateWorkflowException(reason)
    }

    return latestWorkflowDef.getVersion()
  }
}

export default SubWorkflowTaskMapper
