/** Bounded, exact-shape JSON readers. These validate records, never evidence authenticity. */
export type Reader<T> = (value: unknown) => T;
export function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
export const token: Reader<string> = value => {
  ensure(typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/.test(value), 'Expected opaque identifier');
  return value;
};
export const cents: Reader<number> = value => {
  ensure(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0, 'Expected nonnegative safe integer');
  return value;
};
export const basisPoints: Reader<number> = value => {
  const n = cents(value); ensure(n <= 10000, 'Basis points exceed 10000'); return n;
};
export const date: Reader<string> = value => {
  ensure(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value), 'Expected canonical UTC timestamp');
  ensure(Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value, 'Invalid timestamp'); return value;
};
export function choice<const T extends readonly string[]>(...values: T): Reader<T[number]> {
  return value => { ensure(typeof value === 'string' && values.includes(value), 'Unknown enum value'); return value as T[number]; };
}
export function list<T>(reader: Reader<T>, min = 0): Reader<T[]> {
  return value => { ensure(Array.isArray(value) && value.length >= min && value.length <= 500, 'Invalid list size'); for (let i = 0; i < value.length; i++) ensure(Object.hasOwn(value, i), 'Sparse lists are invalid'); return Array.from(value, reader); };
}
export function nullable<T>(reader: Reader<T>): Reader<T | null> { return value => value === null ? null : reader(value); }
export function shape<T extends Record<string, Reader<unknown>>>(fields: T): Reader<{ [K in keyof T]: ReturnType<T[K]> }> {
  return value => {
    ensure(value !== null && typeof value === 'object' && !Array.isArray(value), 'Expected object');
    ensure(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null, 'Invalid object prototype');
    const record = value as Record<string, unknown>;
    ensure(Object.keys(record).length === Object.keys(fields).length && Object.keys(record).every(key => Object.hasOwn(fields, key)), 'Unknown or missing field');
    const result: Record<string, unknown> = {};
    for (const [key, reader] of Object.entries(fields)) { ensure(Object.hasOwn(record, key), 'Missing field'); result[key] = reader(record[key]); }
    return result as { [K in keyof T]: ReturnType<T[K]> };
  };
}
export function parse<T>(json: string, reader: Reader<T>): T {
  ensure(typeof json === 'string' && json.length <= 250000, 'Record exceeds input limit');
  return reader(JSON.parse(json) as unknown);
}
export function unique(values: readonly string[], label: string): void { ensure(new Set(values).size === values.length, `Duplicate ${label}`); }
export function sum(values: readonly number[]): number {
  return values.reduce((a, b) => { const total = a + b; ensure(Number.isSafeInteger(total), 'Total exceeds safe integer range'); return total; }, 0);
}
