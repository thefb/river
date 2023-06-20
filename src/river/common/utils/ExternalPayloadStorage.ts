export enum ExternalPayloadStorageOperation {
  READ = 'READ',
  WRITE = 'WRITE'
}

export enum ExternalPayloadStoragePayloadType {
  WORKFLOW_INPUT = 'WORKFLOW_INPUT',
  WORKFLOW_OUTPUT = 'WORKFLOW_OUTPUT',
  TASK_INPUT = 'TASK_INPUT',
  TASK_OUTPUT = 'TASK_OUTPUT'
}

export interface ExternalStorageLocation {
  uri: string
  path: string
}

export interface ExternalPayloadStorage {
  getLocation(
    operation: ExternalPayloadStorageOperation,
    payloadType: ExternalPayloadStoragePayloadType,
    path?: string
  ): ExternalStorageLocation

  getLocation(
    operation: ExternalPayloadStorageOperation,
    payloadType: ExternalPayloadStoragePayloadType,
    path: string,
    payloadBytes: Uint8Array
  ): ExternalStorageLocation

  upload(
    path: string,
    payload: ReadableStream<Uint8Array>,
    payloadSize: number
  ): void

  download(path: string): ReadableStream<Uint8Array>
}
