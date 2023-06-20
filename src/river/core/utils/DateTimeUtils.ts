export class DateTimeUtils {
  private static patterns: string[] = [
    'yyyy-MM-dd HH:mm',
    'yyyy-MM-dd HH:mm z',
    'yyyy-MM-dd'
  ]

  public static parseDuration (text: string): number {
    const regex =
      /\s*(?:(\d+)\s*(?:days?|d))?\s*(?:(\d+)\s*(?:hours?|hrs?|h))?\s*(?:(\d+)\s*(?:minutes?|mins?|m))?\s*(?:(\d+)\s*(?:seconds?|secs?|s))?\s*/i
    const matches = text.match(regex)

    if (!matches) {
      throw new Error('Not valid duration: ' + text)
    }

    const days = matches[1] ? parseInt(matches[1], 10) : 0
    const hours = matches[2] ? parseInt(matches[2], 10) : 0
    const minutes = matches[3] ? parseInt(matches[3], 10) : 0
    const seconds = matches[4] ? parseInt(matches[4], 10) : 0

    return ((days * 24 + hours) * 60 + minutes) * 60 + seconds * 1000
  }

  public static parseDate (date: string): Date {
    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date format: ' + date)
    }
    return parsedDate
  }
}
