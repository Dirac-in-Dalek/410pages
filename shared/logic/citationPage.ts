/** The first page number is used consistently for display, drafts and persistence. */
export function parseCitationPage(page: string | null | undefined): number | undefined {
  const match = page?.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : undefined;
}
