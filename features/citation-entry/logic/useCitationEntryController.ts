import React, { useEffect, useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { BookComposerDraftStore } from './bookComposerDrafts';
import { AddCitationInput } from '../../../types';
import {
  CitationEditorPrefill,
  CitationEditorProps,
  CitationEditorValues,
  CitationEntryDropPayload,
} from '../contract/citationEntryContract';
import {
  canSubmitCitationEntry,
  didCitationEntrySubmitFail,
  isCitationEntrySelfAuthor,
  isCitationEntrySequentialMode,
  resolveCitationEntryTextareaHeight,
} from '../policy/citationEntryPolicy';

const createResetValues = (
  prefillData?: CitationEditorPrefill
): CitationEditorValues => ({
  text: '',
  author: prefillData?.author || '',
  book: prefillData?.book || '',
  bookId: prefillData?.bookId,
  page: '',
});

export const createCitationInput = (values: CitationEditorValues): AddCitationInput => {
  return {
    kind: 'sentence',
    text: values.text,
    author: values.author,
    book: values.book,
    ...(values.bookId ? { bookId: values.bookId } : {}),
    page: values.page || undefined,
    tags: [],
  };
};

export const useCitationEntryController = ({
  onAddCitation,
  prefillData,
  username,
  controlledValues,
  draftScope,
  draftStore,
  readOnly = false,
  sequentialPageEntry = false,
  autoFocusText = false,
}: Pick<
  CitationEditorProps,
  'draftStore' | 'draftScope' | 'onAddCitation' | 'prefillData' | 'username' | 'controlledValues' | 'readOnly' | 'sequentialPageEntry' | 'autoFocusText'
>) => {
  const localDraftStore = useRef(new BookComposerDraftStore()).current;
  const drafts = draftStore ?? localDraftStore;
  const scope = draftScope ?? '';
  const snapshot = useSyncExternalStore(drafts.subscribe, () => drafts.get(scope));
  const values = snapshot?.values ?? createResetValues(prefillData);
  const isSubmitting = snapshot?.saving ?? false;
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const prefillAuthor = prefillData?.author;
  const prefillBook = prefillData?.book;
  const prefillBookId = prefillData?.bookId;
  const isControlled = Boolean(controlledValues);
  const controlledText = controlledValues?.text;
  const controlledAuthor = controlledValues?.author;
  const controlledBook = controlledValues?.book;
  const controlledBookId = controlledValues?.bookId;
  const controlledPage = controlledValues?.page;
  const setValues = useCallback((update: React.SetStateAction<CitationEditorValues>) => {
    const current = drafts.get(scope)?.values ?? createResetValues({ author: prefillAuthor ?? "", book: prefillBook ?? "", bookId: prefillBookId });
    drafts.patch(scope, { values: typeof update === 'function' ? update(current) : update });
  }, [drafts, prefillAuthor, prefillBook, prefillBookId, scope]);
  const setIsSubmitting = (saving: boolean) => drafts.patch(scope, { saving });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const resize = () => {
      const scrollTop = textarea.scrollTop;
      const style = getComputedStyle(textarea);
      const oneLineHeight = Math.ceil((parseFloat(style.lineHeight) || 0)
        + (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0));
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(oneLineHeight, resolveCitationEntryTextareaHeight(textarea.scrollHeight, values.text))}px`;
      textarea.scrollTop = scrollTop;
    };

    resize();

    let width: number | undefined;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(([entry]) => {
      const nextWidth = entry?.contentRect.width ?? textarea.getBoundingClientRect().width;
      if (nextWidth === width) return;

      width = nextWidth;
      resize();
    });
    observer?.observe(textarea);
    const preferences = new MutationObserver(resize);
    preferences.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-font'] });
    const readingScope = textarea.closest('[data-reading-responsive]');
    if (readingScope && readingScope !== document.documentElement) {
      preferences.observe(readingScope, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    document.fonts?.addEventListener('loadingdone', resize);

    return () => {
      observer?.disconnect();
      preferences.disconnect();
      document.fonts?.removeEventListener('loadingdone', resize);
    };
  }, [values.text]);

  useEffect(() => {
    if (isControlled) return;
    setValues(current => ({ ...current, author: prefillAuthor || '', book: prefillBook || '', bookId: prefillBookId }));
  }, [isControlled, prefillAuthor, prefillBook, prefillBookId, setValues]);

  useEffect(() => {
    if (!isControlled) return;
    setValues({ text: controlledText ?? '', author: controlledAuthor ?? '', book: controlledBook ?? '',
      bookId: controlledBookId, page: controlledPage ?? '' });
  }, [isControlled, controlledText, controlledAuthor, controlledBook, controlledBookId, controlledPage, setValues]);

  useEffect(() => {
    if (!autoFocusText || readOnly) return;

    const frameId = window.requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [autoFocusText, readOnly, prefillData?.author, prefillData?.book]);

  const focusTextInput = () => {
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true });
    });
  };

  const focusPageInput = () => {
    pageInputRef.current?.focus({ preventScroll: true });
  };

  const isSequentialPageEntryActive = isCitationEntrySequentialMode(sequentialPageEntry, readOnly, values);
  const isSelf = isCitationEntrySelfAuthor(values.author, username);
  const canSubmit = canSubmitCitationEntry({
    readOnly,
    isSubmitting,
    text: values.text,
  });

  const updateValue = (field: keyof CitationEditorValues, nextValue: string) => {
    setValues((current) => ({
      ...current,
      [field]: nextValue,
      ...((field === 'author' || field === 'book') ? { bookId: undefined } : {}),
    }));
  };

  const handleSubmit = async () => {
    if (!canSubmit || drafts.get(scope)?.saving) return false;
    try {
      setIsSubmitting(true);
      const result = await Promise.resolve(onAddCitation(createCitationInput(values)));

      if (didCitationEntrySubmitFail(result)) {
        return false;
      }

      setValues(createResetValues(prefillData));
      if (isSequentialPageEntryActive) {
        focusTextInput();
      }

      return true;
    } catch (error) {
      console.error('Error adding citation from editor:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    if (readOnly) return;
    event.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    if (readOnly) return;
    event.preventDefault();
    setIsDraggingOver(false);

    try {
      const raw = event.dataTransfer.getData('application/json');
      if (!raw) return;

      const data = JSON.parse(raw) as CitationEntryDropPayload;
      if (data.type !== 'reference') return;

      setValues((current) => ({
        ...current,
        author: data.author !== undefined ? data.author : current.author,
        book: data.book !== undefined ? data.book : current.book,
        bookId: data.bookId,
      }));
    } catch (error) {
      console.error('Error parsing drop data', error);
    }
  };

  return {
    values,
    isSubmitting,
    isDraggingOver,
    isSelf,
    canSubmit,
    isSequentialPageEntryActive,
    textareaRef,
    pageInputRef,
    updateValue,
    handleSubmit,
    focusPageInput,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};
