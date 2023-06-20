import { Transform, Type, plainToClass } from 'class-transformer'

export class ObjectMapperProvider {
  public getObjectMapper (): any {
    // Configure the ObjectMapper or JSON library of your choice
    // and provide the necessary serialization and deserialization methods

    // Example using class-transformer library
    const objectMapper: any = {
      serialize: (object: any) => JSON.stringify(object),
      deserialize: (json: any, targetType: any) =>
        plainToClass(targetType, JSON.parse(json))
    }

    return objectMapper
  }
}
