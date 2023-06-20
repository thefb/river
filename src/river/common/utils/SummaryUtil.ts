import pino, { Logger } from 'pino';
import { plainToClass, classToPlain } from 'class-transformer';

class SummaryUtil {
  private static readonly logger: Logger = pino();

  private static isSummaryInputOutputJsonSerializationEnabled: boolean;

  // Add the equivalent of `@Value` annotation in TypeScript
  private isJsonSerializationEnabled = false;

  public init(): void {
    SummaryUtil.isSummaryInputOutputJsonSerializationEnabled = this.isJsonSerializationEnabled;
  }

  /**
   * Serializes the Workflow or Task's Input/Output object by Java's toString (default), or by a
   * Json ObjectMapper (@see Configuration.isSummaryInputOutputJsonSerializationEnabled)
   *
   * @param object the Input or Output Object to serialize
   * @return the serialized string of the Input or Output object
   */
  public static serializeInputOutput(object: any): string {
    if (!SummaryUtil.isSummaryInputOutputJsonSerializationEnabled) {
      return JSON.stringify(object);
    }

    try {
      const plainObject: any = classToPlain(object as any); // Type assertion to any
      return JSON.stringify(plainObject);
    } catch (e) {
      SummaryUtil.logger.error(
        `The provided value (${JSON.stringify(object)}) could not be serialized as Json`,
        e
      );
      throw new Error(`Serialization error: ${e}`);
    }
  }
}
