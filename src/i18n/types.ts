/**
 * TypeScript type definitions for i18n messages
 *
 * This file provides type-safe access to translation namespaces and keys.
 * Types are based on the message structure in messages/en.json
 */

/**
 * Available message namespaces
 * Each namespace corresponds to a top-level key in the messages JSON files
 */
export type MessageNamespace =
  | "common"
  | "navigation"
  | "auth"
  | "errors"
  | "toasts"
  | "accessibility"
  | "validation"
  | "status"
  | "tools";

/**
 * Type for nested message keys (e.g., "navigation.breadcrumbs.home")
 * This allows dot-notation access to nested translation keys
 */
export type MessageKey<T extends MessageNamespace> = T extends "navigation"
  ? "breadcrumbs.home" | "breadcrumbs.separator" | keyof Messages["navigation"]
  : T extends "validation"
    ?
        | "password.minLength"
        | "password.requireUppercase"
        | "password.requireLowercase"
        | "password.requireNumber"
        | "password.requireSpecial"
        | "password.mismatch"
        | keyof Messages["validation"]
    : T extends "tools"
      ?
          | "categories.upload"
          | "categories.create"
          | "categories.search"
          | "pdf.label"
          | "pdf.description"
          | "webcam.label"
          | "webcam.description"
          | "homework.label"
          | "homework.description"
          | "studyKit.label"
          | "studyKit.description"
          | "mindmap.label"
          | "mindmap.description"
          | "quiz.label"
          | "quiz.description"
          | "flashcard.label"
          | "flashcard.description"
          | "demo.label"
          | "demo.description"
          | "summary.label"
          | "summary.description"
          | "diagram.label"
          | "diagram.description"
          | "timeline.label"
          | "timeline.description"
          | "formula.label"
          | "formula.description"
          | "chart.label"
          | "chart.description"
          | "typing.label"
          | "typing.description"
          | "search.label"
          | "search.description"
          | keyof Messages["tools"]
      : keyof Messages[T];

/**
 * Full message structure matching messages/en.json
 * This interface represents the complete shape of all translation messages
 */
export interface Messages {
  common: {
    loading: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    confirm: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    add: string;
    remove: string;
    search: string;
    filter: string;
    sort: string;
    refresh: string;
    close: string;
    back: string;
    next: string;
    previous: string;
    submit: string;
    reset: string;
    clear: string;
    select: string;
    selectAll: string;
    deselectAll: string;
    yes: string;
    no: string;
    ok: string;
    apply: string;
    view: string;
    download: string;
    upload: string;
    print: string;
    export: string;
    import: string;
    copy: string;
    paste: string;
    cut: string;
    undo: string;
    redo: string;
    help: string;
    settings: string;
    profile: string;
    logout: string;
    login: string;
  };
  navigation: {
    home: string;
    dashboard: string;
    chat: string;
    maestri: string;
    coaches: string;
    buddies: string;
    tools: string;
    flashcards: string;
    mindmap: string;
    quiz: string;
    homework: string;
    documents: string;
    learningPath: string;
    progress: string;
    achievements: string;
    settings: string;
    profile: string;
    admin: string;
    help: string;
    support: string;
    about: string;
    privacy: string;
    terms: string;
    breadcrumbs: {
      home: string;
      separator: string;
    };
  };
  auth: {
    login: string;
    logout: string;
    register: string;
    signIn: string;
    signUp: string;
    signOut: string;
    email: string;
    password: string;
    confirmPassword: string;
    username: string;
    rememberMe: string;
    forgotPassword: string;
    resetPassword: string;
    changePassword: string;
    newPassword: string;
    currentPassword: string;
    createAccount: string;
    alreadyHaveAccount: string;
    dontHaveAccount: string;
    backToLogin: string;
    welcomeBack: string;
    welcome: string;
    loginSuccess: string;
    logoutSuccess: string;
    registrationSuccess: string;
    invalidCredentials: string;
    emailRequired: string;
    passwordRequired: string;
    passwordMismatch: string;
    passwordTooShort: string;
    emailInvalid: string;
    userExists: string;
    userNotFound: string;
    sessionExpired: string;
    unauthorized: string;
  };
  errors: {
    generic: string;
    unknown: string;
    network: string;
    timeout: string;
    notFound: string;
    forbidden: string;
    unauthorized: string;
    serverError: string;
    badRequest: string;
    validation: string;
    required: string;
    invalidFormat: string;
    tooShort: string;
    tooLong: string;
    invalidEmail: string;
    invalidUrl: string;
    invalidPhone: string;
    invalidDate: string;
    fileTooBig: string;
    fileTypeNotAllowed: string;
    uploadFailed: string;
    downloadFailed: string;
    saveFailed: string;
    deleteFailed: string;
    loadFailed: string;
    tryAgain: string;
    contactSupport: string;
  };
  accessibility: {
    skipToContent: string;
    skipToNavigation: string;
    openMenu: string;
    closeMenu: string;
    toggleMenu: string;
    openDialog: string;
    closeDialog: string;
    loading: string;
    loadingComplete: string;
    searchResults: string;
    noResults: string;
    currentPage: string;
    page: string;
    of: string;
    selected: string;
    sortAscending: string;
    sortDescending: string;
    expandSection: string;
    collapseSection: string;
    showMore: string;
    showLess: string;
    required: string;
    optional: string;
    errorMessage: string;
    warningMessage: string;
    successMessage: string;
    infoMessage: string;
    screenReaderOnly: string;
    newWindow: string;
    externalLink: string;
  };
  validation: {
    required: string;
    email: string;
    minLength: string;
    maxLength: string;
    pattern: string;
    numeric: string;
    url: string;
    date: string;
    phone: string;
    password: {
      minLength: string;
      requireUppercase: string;
      requireLowercase: string;
      requireNumber: string;
      requireSpecial: string;
      mismatch: string;
    };
  };
  status: {
    active: string;
    inactive: string;
    pending: string;
    completed: string;
    cancelled: string;
    draft: string;
    published: string;
    archived: string;
    deleted: string;
    enabled: string;
    disabled: string;
    online: string;
    offline: string;
    available: string;
    unavailable: string;
    processing: string;
    success: string;
    failed: string;
    error: string;
  };
  tools: {
    categories: {
      upload: string;
      create: string;
      search: string;
    };
    pdf: {
      label: string;
      description: string;
    };
    webcam: {
      label: string;
      description: string;
    };
    homework: {
      label: string;
      description: string;
    };
    studyKit: {
      label: string;
      description: string;
    };
    mindmap: {
      label: string;
      description: string;
    };
    quiz: {
      label: string;
      description: string;
    };
    flashcard: {
      label: string;
      description: string;
    };
    demo: {
      label: string;
      description: string;
    };
    summary: {
      label: string;
      description: string;
    };
    diagram: {
      label: string;
      description: string;
    };
    timeline: {
      label: string;
      description: string;
    };
    formula: {
      label: string;
      description: string;
    };
    chart: {
      label: string;
      description: string;
    };
    typing: {
      label: string;
      description: string;
    };
    search: {
      label: string;
      description: string;
    };
  };
  toasts: {
    trial: {
      welcome: {
        title: string;
        message: string;
        action: string;
      };
      warning3Left: {
        title: string;
        message: string;
        action: string;
      };
      lastMessage: {
        title: string;
        message: string;
        action: string;
      };
      exhausted: {
        title: string;
        message: string;
        action: string;
      };
    };
    admin: {
      tierChanged: string;
      tierChangeFailed: string;
      limitOverrideSuccess: string;
      limitOverrideFailed: string;
      noSubscription: string;
      bulkTierSuccess: string;
      bulkTierFailed: string;
      tierSaved: string;
      tierSaveFailed: string;
      requiredFields: string;
    };
    pdf: {
      downloaded: string;
      downloadedAndSaved: string;
      exportFailed: string;
      generationFailed: string;
    };
    quiz: {
      completed: string;
      masteryAchieved: string;
      keepGoing: string;
    };
    flashcard: {
      completed: string;
      masteryAchieved: string;
      keepGoing: string;
    };
    mindmap: {
      saved: string;
      saveFailed: string;
    };
    pomodoro: {
      sessionComplete: string;
      focusTime: string;
    };
    typing: {
      stickyKeysEnabled: string;
      stickyKeysDisabled: string;
      stickyKeysFailed: string;
      stickyKeysInfo: string;
      stickyKeysActive: string;
    };
    googleDrive: {
      notReady: string;
      notConnected: string;
      configMissing: string;
    };
    storage: {
      storageAdded: string;
    };
    maestro: {
      sessionSaved: string;
    };
    tos: {
      mustAccept: string;
    };
    studyKit: {
      printFailed: string;
      mindmapSaved: string;
      flashcardsSaved: string;
    };
  };
}

/**
 * Type for translation variables (placeholders like {min}, {max}, etc.)
 */
export type TranslationVariables = Record<string, string | number>;
