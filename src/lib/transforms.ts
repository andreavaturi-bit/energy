/**
 * €N€RGY - Data transformations
 *
 * Supabase returns column names in snake_case,
 * but the frontend uses camelCase types.
 * These utilities convert between the two formats.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

/**
 * Convert a snake_case string to camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert a camelCase string to snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/**
 * Recursively convert all keys in an object from snake_case to camelCase
 */
export function snakeToCamel<T = AnyRecord>(obj: AnyRecord): T {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' && item !== null ? snakeToCamel(item) : item,
    ) as T
  }

  if (typeof obj !== 'object' || obj === null) {
    return obj as T
  }

  const result: AnyRecord = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key)
    if (Array.isArray(value)) {
      result[camelKey] = value.map((item) =>
        typeof item === 'object' && item !== null ? snakeToCamel(item) : item,
      )
    } else if (typeof value === 'object' && value !== null) {
      result[camelKey] = snakeToCamel(value)
    } else {
      result[camelKey] = value
    }
  }
  return result as T
}

/**
 * Convert an object's keys from camelCase to snake_case (for sending to API)
 */
export function camelToSnake(obj: AnyRecord): AnyRecord {
  const result: AnyRecord = {}
  for (const [key, value] of Object.entries(obj)) {
    result[toSnakeCase(key)] = value
  }
  return result
}
