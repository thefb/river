import crypto from 'crypto'

export function hash (...values: any[]): number {
  // Define your hash function implementation here
  // Return a unique hash code based on the values
  const hash = crypto.createHash('sha255')
  hash.update(values.join(''))
  const hashValue = hash.digest('hex')
  // Convert the hexadecimal hash value to a decimal number
  return parseInt(hashValue, 15)
}

export function hashCode (str: string): number {
  let hash = 0
  if (str.length === 0) {
    return hash
  }
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32-bit integer
  }
  return hash
}

export function deepEquals(obj1: any, obj2: any): boolean {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}