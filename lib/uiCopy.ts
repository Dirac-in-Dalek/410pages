export const uiCopy = {
  common: {
    actions: {
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      copy: 'Copy',
      copied: 'Copied!',
      check: 'Check'
    },
    unknownError: 'Unknown error'
  },
  archive: {
    allCitations: 'All Citations',
    searchPrefix: 'Search:',
    projectFallback: 'Project',
    authorView: 'Author View',
    bookView: 'Book View',
    sort: {
      date: 'Date',
      page: 'Page',
      sortBy: 'Sort by',
      ascending: 'Ascending',
      descending: 'Descending'
    }
  },
  auth: {
    invalidEmail: 'Please enter a valid email address.',
    emailInUse: 'This email is already in use.',
    emailAvailable: 'This email is available.',
    emailCheckFailed: 'Email check failed',
    checkEmail: 'Check Email',
    checkEmailFirst: 'Check email availability first.',
    verifyEmailTitle: 'Check your email',
    verifyEmailIntro: 'We sent a verification email to',
    verifyEmailBody: 'Click the link in your inbox to complete sign-up.',
    backToSignIn: 'Back to sign in',
    spamHint: 'Did not receive it? Check your spam folder.'
  },
  citation: {
    removeHighlight: 'Click to remove highlight',
    deleteCitationConfirm: 'Delete this citation?',
    newNotePlaceholder: 'Write a new note...',
    saveNote: 'Save Note'
  },
  modals: {
    batchDeleteTitle: 'Delete selected citations?',
    batchDeleteMessagePrefix: 'Selected ',
    batchDeleteMessageSuffix: ' citations will be permanently deleted. This action cannot be undone.'
  },
  project: {
    removeProjectConfirm: 'Remove this folder?',
    removeProjectAction: 'Remove'
  },
  reader: {
    thumbnailEmpty: 'Upload a PDF to show thumbnails.',
    thumbnailLoading: 'Preparing thumbnails...',
    thumbnailError: 'Failed to load thumbnails.',
    saveSelectionError: 'Failed to save citation. Please try again.',
    uploadPdfOnly: 'Only PDF files can be uploaded.',
    metaAuthorRequired: 'Author is required.',
    metaTitleRequired: 'Please enter a title.',
    metaMappingBothRequired: 'Enter both page-mapping fields together.',
    metaMappingPositiveInteger: 'Page mapping must use integers greater than 0.',
    metaSaveFailed: 'Failed to save metadata. Please try again shortly.',
    metaUpdatedNotice: (count: number) => `Updated author/title for ${count} citation(s) in this document.`,
    continuousScrollHint: 'Read in continuous scroll and drag text to save.',
    metaRequiredHint: 'Enter metadata before capture.',
    uploadPrompt: 'Upload a PDF to read and capture here.',
    openPdfFailedPrefix: 'Unable to open PDF.',
    openPdfFailedFallback: 'Please choose the file again.',
    loadingPdf: 'Loading PDF...',
    loadingPage: 'Preparing page...',
    authorHint: 'Adding an author improves document filtering.',
    draftPlaceholderReady: 'Drag text in the PDF and it will appear here.',
    draftPlaceholderNeedMeta: 'Enter author/title metadata first.',
    noDocumentCitations: 'No citations yet for this document (matching author + title).',
    metadataDescription: 'Author is required. Title is auto-filled from the file name.',
    authorExample: 'e.g.',
    titlePlaceholder: 'Document title',
    pdfStartPage: 'PDF start page',
    bookStartPage: 'Book start page',
    mappingHelp: 'Mapping is optional. If set, book page numbers are computed even when PDF page labels are missing.'
  }
} as const;
