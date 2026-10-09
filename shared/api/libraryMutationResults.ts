import type {
  AuthorDeletePreview,
  BookDeletePreview,
  DeleteAuthorCascadeResult,
  DeleteBookCascadeResult,
} from '../../types';

const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid library mutation response');
  return value as Record<string, unknown>;
};
const string = (row: Record<string, unknown>, key: string): string => {
  if (typeof row[key] !== 'string') throw new Error(`Invalid mutation field: ${key}`);
  return row[key];
};
const count = (row: Record<string, unknown>, key: string): number => {
  const value = row[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0)
    throw new Error(`Invalid mutation count: ${key}`);
  return value;
};
const ids = (row: Record<string, unknown>, key: string): string[] => {
  const value = row[key];
  if (!Array.isArray(value) || !value.every((id) => typeof id === 'string'))
    throw new Error(`Invalid mutation IDs: ${key}`);
  return value;
};

export function parseBookDeleteResult(value: unknown): DeleteBookCascadeResult {
  const row = record(value);
  return { bookId: string(row, 'bookId'), deletedCitationCount: count(row, 'deletedCitationCount') };
}
export function parseBookDeletePreview(value: unknown): BookDeletePreview {
  const row = record(value);
  return { bookId: string(row, 'bookId'), citationCount: count(row, 'citationCount') };
}
export function parseAuthorDeleteResult(value: unknown): DeleteAuthorCascadeResult {
  const row = record(value);
  return {
    authorId: string(row, 'authorId'),
    deletedBookIds: ids(row, 'deletedBookIds'),
    deletedBookCount: count(row, 'deletedBookCount'),
    deletedCitationCount: count(row, 'deletedCitationCount'),
  };
}
export function parseAuthorDeletePreview(value: unknown): AuthorDeletePreview {
  const row = record(value);
  return {
    authorId: string(row, 'authorId'),
    bookIds: ids(row, 'bookIds'),
    bookCount: count(row, 'bookCount'),
    citationCount: count(row, 'citationCount'),
  };
}
