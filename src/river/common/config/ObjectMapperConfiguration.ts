export class ObjectMapperConfiguration {
  private readonly objectMapper: any

  constructor (objectMapper: any) {
    this.objectMapper = objectMapper
    this.customizeDefaultObjectMapper()
  }

  private customizeDefaultObjectMapper (): void {
    // Set default property inclusion
    this.objectMapper.setDefaultPropertyInclusion({
      include: 'ALWAYS',
      contentInclusion: 'NON_NULL'
    })
  }
}
