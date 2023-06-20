interface ActionProcessor {
  execute(
    action: EventHandler.Action,
    payloadObject: any,
    event: string,
    messageId: string
  ): Map<string, object>
}

export = ActionProcessor
