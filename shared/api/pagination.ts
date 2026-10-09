type PageResult<T> = { data: T[] | null; error: unknown };

/** Advance by the rows actually returned: the server cap may be below our page size. */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const rows: T[] = [];
  while (true) {
    const { data, error } = await fetchPage(rows.length, rows.length + 999);
    if (error) throw error;
    if (!data?.length) return rows;
    rows.push(...data);
  }
}
