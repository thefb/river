export class SearchResult<T> {
  private totalHits: number
  private results: T[]

  constructor (totalHits: number, results: T[]) {
    this.totalHits = totalHits
    this.results = results
  }
}
