import React, { useEffect, useRef, useState } from 'react';
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
  page: '',
});

const createCitationInput = (values: CitationEditorValues): AddCitationInput => ({
  text: values.text,
  author: values.author,
  book: values.book,
  page: values.page || undefined,
  tags: [],
});

export const useCitationEntryController = ({
  onAddCitation,
  prefillData,
  username,
  controlledValues,
  readOnly = false,
  sequentialPageEntry = false,
  autoFocusText = false,
}: Pick<
  CitationEditorProps,
  'onAddCitation' | 'prefillData' | 'username' | 'controlledValues' | 'readOnly' | 'sequentialPageEntry' | 'autoFocusText'
>) => {
  const [values, setValues] = useState<CitationEditorValues>(createResetValues(prefillData));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${resolveCitationEntryTextareaHeight(textarea.scrollHeight, values.text)}px`;
  }, [values.text]);

  useEffect(() => {
    if (controlledValues) return;
    setValues((current) => ({
      ...current,
      author: prefillData?.author || '',
      book: prefillData?.book || '',
    }));
  }, [controlledValues, prefillData]);

  useEffect(() => {
    if (!controlledValues) return;

    setValues({
      text: controlledValues.text ?? '',
      author: controlledValues.author ?? '',
      book: controlledValues.book ?? '',
      page: controlledValues.page ?? '',
    });
  }, [
    controlledValues,
    controlledValues?.author,
    controlledValues?.book,
    controlledValues?.page,
    controlledValues?.text,
  ]);

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
    setValues((current) => ({ ...current, [field]: nextValue }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return false;

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
