/**
 * Type Conversion Utilities
 *
 * These utilities bridge the gap between database null values and
 * TypeScript/React component conventions that prefer undefined.
 *
 * Background: PostgreSQL/Drizzle returns `null` for nullable columns,
 * but React component props typically use `undefined` for optional values.
 * This mismatch causes TypeScript errors like:
 *   "Type 'string | null' is not assignable to type 'string | undefined'"
 *
 * Usage:
 *   In data-fetching functions, apply after querying:
 *
 *   const data = await db.select(...).from(...);
 *   return {
 *     name: data.name,
 *     code: nullToUndefined(data.code),  // string | null -> string | undefined
 *     level: nullToUndefined(data.level),
 *   };
 */

/**
 * Converts null to undefined, preserving other values.
 *
 * @example
 * nullToUndefined(null)       // => undefined
 * nullToUndefined("hello")    // => "hello"
 * nullToUndefined(0)          // => 0
 * nullToUndefined(undefined)  // => undefined
 */
export function nullToUndefined<T>(value: T | null): T | undefined {
  return value ?? undefined;
}

/**
 * Type helper that converts null to undefined in a type.
 * Useful for typing return values.
 */
export type NullToUndefined<T> = T extends null ? undefined : T;

/**
 * Converts all null properties in an object to undefined.
 * Useful for normalizing entire database rows.
 *
 * @example
 * normalizeNullFields({ name: "John", code: null, level: "A1" })
 * // => { name: "John", code: undefined, level: "A1" }
 */
export function normalizeNullFields<T extends Record<string, unknown>>(
  obj: T
): { [K in keyof T]: T[K] extends null ? undefined : T[K] } {
  const result = {} as { [K in keyof T]: T[K] extends null ? undefined : T[K] };
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = (obj[key] ?? undefined) as typeof result[typeof key];
    }
  }
  return result;
}
