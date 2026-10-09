import type { Database as GeneratedDatabase } from './database.types';

type BulkUpdate = GeneratedDatabase['public']['Functions']['bulk_update_citation_source'];

/** PostgreSQL function arguments can accept NULL; generated types omit that fact. */
export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GeneratedDatabase['public'], 'Functions'> & {
    Functions: Omit<GeneratedDatabase['public']['Functions'], 'bulk_update_citation_source'> & {
      bulk_update_citation_source: Omit<BulkUpdate, 'Args'> & {
        Args: Omit<BulkUpdate['Args'], 'destination_book_id'> & { destination_book_id: string | null };
      };
    };
  };
};
