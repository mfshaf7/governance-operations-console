export class GovernanceActivityValidationError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "governance_activity_projection_invalid", status = 502) {
    super(message);
    this.name = "GovernanceActivityValidationError";
    this.code = code;
    this.status = status;
  }
}

export function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) invalid(`${label} must be an array.`);
  return value;
}

export function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") invalid(`${label} must be a boolean.`);
  return value;
}

export function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    invalid(`${label} must be a non-negative integer.`);
  }
  return Number(value);
}

export function nullableText(value: unknown, label: string): string | null {
  if (value === null) return null;
  return text(value, label);
}

export function nullableTimestamp(value: unknown, label: string): string | null {
  if (value === null) return null;
  return timestamp(value, label);
}

export function oneOf<T extends string>(
  value: unknown,
  values: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    invalid(`${label} is invalid.`);
  }
  return value as T;
}

export function record(
  value: unknown,
  label: string,
  allowedKeys?: readonly string[],
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid(`${label} must be an object.`);
  }
  const result = value as Record<string, unknown>;
  if (allowedKeys) {
    const allowed = new Set(allowedKeys);
    const unexpected = Object.keys(result).find((key) => !allowed.has(key));
    if (unexpected) invalid(`${label} contains unsupported field ${unexpected}.`);
  }
  return result;
}

export function text(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    invalid(`${label} must be non-empty text.`);
  }
  return value;
}

export function timestamp(value: unknown, label: string): string {
  const result = text(value, label);
  if (Number.isNaN(Date.parse(result))) invalid(`${label} must be a timestamp.`);
  return result;
}

export function invalid(message: string): never {
  throw new GovernanceActivityValidationError(message);
}
