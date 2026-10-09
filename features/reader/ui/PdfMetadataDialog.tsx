import React from 'react';
import type { MetaFormState } from '../contract/pdfReaderContract';
type Props = {
  metaForm: MetaFormState;
  setMetaForm: React.Dispatch<React.SetStateAction<MetaFormState>>;
  metaError: string | null;
  setMetaError: (error: string | null) => void;
  isMetaSaving: boolean;
  setIsMetaEditorOpen: (open: boolean) => void;
  handleMetaConfirm: () => void | Promise<void>;
  username: string;
};
export function PdfMetadataDialog({
  metaForm,
  setMetaForm,
  metaError,
  setMetaError,
  isMetaSaving,
  setIsMetaEditorOpen,
  handleMetaConfirm,
  username,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] shadow-2xl">
        <div className="px-5 py-4 border-b border-[var(--border-main)]">
          <h3 className="text-lg font-semibold">PDF Metadata</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Author is required. Title is auto-filled from the file name.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Author *</label>
            <input
              autoFocus
              value={metaForm.author}
              onChange={(event) => setMetaForm((prev) => ({ ...prev, author: event.target.value }))}
              placeholder={`e.g. ${username}`}
              className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Title</label>
            <input
              value={metaForm.title}
              onChange={(event) => setMetaForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Document title"
              className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                PDF start page
              </label>
              <input
                value={metaForm.pdfStartPage}
                onChange={(event) => setMetaForm((prev) => ({ ...prev, pdfStartPage: event.target.value }))}
                placeholder="e.g. 9"
                inputMode="numeric"
                className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Book start page
              </label>
              <input
                value={metaForm.bookStartPage}
                onChange={(event) => setMetaForm((prev) => ({ ...prev, bookStartPage: event.target.value }))}
                placeholder="e.g. 1"
                inputMode="numeric"
                className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm"
              />
            </div>
          </div>

          <p className="text-[11px] text-[var(--text-muted)]">
            Mapping is optional. If set, book page numbers are computed even when PDF page labels are missing.
          </p>

          {metaError && <p className="text-xs text-red-600">{metaError}</p>}
        </div>

        <div className="px-5 py-4 border-t border-[var(--border-main)] flex justify-end gap-2">
          <button
            disabled={isMetaSaving}
            onClick={() => {
              if (isMetaSaving) return;
              setMetaError(null);
              setIsMetaEditorOpen(false);
            }}
            className="px-3 py-2 text-sm rounded-md border border-[var(--border-main)] text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            disabled={isMetaSaving}
            onClick={() => {
              void handleMetaConfirm();
            }}
            className="px-3 py-2 text-sm rounded-md bg-[var(--accent)] accent-button hover:bg-[var(--accent-strong)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isMetaSaving ? 'Updating...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
