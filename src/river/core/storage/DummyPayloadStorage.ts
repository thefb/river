export class DummyPayloadStorage implements ExternalPayloadStorage {
  getLocation (
    operation: Operation,
    payloadType: PayloadType,
    path: string
  ): ExternalStorageLocation {
    return null
  }

  upload (path: string, payload: InputStream, payloadSize: number): void {}

  download (path: string): InputStream {
    return null
  }
}
