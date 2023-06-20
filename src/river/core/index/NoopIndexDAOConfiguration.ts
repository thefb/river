export class NoopIndexDAOConfiguration {
  noopIndexDAO (): IndexDAO {
    return new NoopIndexDAO()
  }
}
