export class MissingMutationTargetError extends Error {
  readonly code = 'not_found';
  constructor(target: string) {
    super(`${target} no longer exists or is not accessible`);
    this.name = 'MissingMutationTargetError';
  }
}

export function requireMutationRow<T>(data: T | null, error: unknown, target: string): T {
  if (error) throw error;
  if (!data) throw new MissingMutationTargetError(target);
  return data;
}
