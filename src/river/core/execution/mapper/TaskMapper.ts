interface TaskMapper {
    getTaskType(): string;
    getMappedTasks(taskMapperContext: TaskMapperContext): TaskModel[];
  }
  
  export default TaskMapper;