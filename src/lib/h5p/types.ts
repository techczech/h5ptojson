// H5P Package metadata from h5p.json
export interface H5PMetadata {
  title: string
  language?: string
  defaultLanguage?: string
  mainLibrary: string
  embedTypes?: string[]
  license?: string
  preloadedDependencies?: H5PDependency[]
}

export interface H5PDependency {
  machineName: string
  majorVersion: number
  minorVersion: number
}

// Media types
export interface H5PFile {
  path: string
  mime: string
  copyright?: { license: string }
  width?: number
  height?: number
  alt?: string
}

// Element action (content inside slide elements)
export interface H5PAction {
  library: string
  params: Record<string, unknown>
  metadata?: {
    contentType?: string
    license?: string
    title?: string
  }
  subContentId?: string
}

// Slide element
export interface H5PElement {
  x: number
  y: number
  width?: number
  height?: number
  action?: H5PAction
  title?: string
  goToSlide?: number
  goToSlideType?: 'specified' | 'next' | 'previous'
  displayAsButton?: boolean
  buttonSize?: 'small' | 'big'
  backgroundOpacity?: number
  invisible?: boolean
  solution?: string
  alwaysDisplayComments?: boolean
}

// Slide keyword
export interface H5PKeyword {
  main?: string
  subs?: string[]
}

// Slide in CoursePresentation
export interface H5PSlide {
  elements: H5PElement[]
  keywords?: H5PKeyword[]
  slideBackgroundSelector?: {
    imageSlideBackground?: string
    fillSlideBackground?: string
  }
}

// CoursePresentation content
export interface H5PCoursePresentation {
  presentation: {
    slides: H5PSlide[]
    keywordListEnabled?: boolean
    globalBackgroundSelector?: {
      imageGlobalBackground?: string
      fillGlobalBackground?: string
    }
  }
  override?: Record<string, unknown>
  l10n?: Record<string, string>
}

// MultiChoice question
export interface H5PMultiChoiceAnswer {
  text: string
  correct: boolean
  tipsAndFeedback?: {
    tip?: string
    chosenFeedback?: string
    notChosenFeedback?: string
  }
}

export interface H5PMultiChoice {
  question: string
  answers: H5PMultiChoiceAnswer[]
  behaviour?: {
    enableRetry?: boolean
    enableSolutionsButton?: boolean
    type?: 'auto' | 'multi' | 'single'
    randomAnswers?: boolean
  }
  media?: {
    type?: H5PAction
  }
}

// Summary quiz
export interface H5PSummaryStatement {
  summary: string[]
  tip?: { tip?: string }
}

export interface H5PSummary {
  intro: string
  summaries: H5PSummaryStatement[]
}

// TrueFalse question
export interface H5PTrueFalse {
  question: string
  correct: 'true' | 'false'
  behaviour?: {
    enableRetry?: boolean
    enableSolutionsButton?: boolean
  }
  media?: {
    type?: H5PAction
  }
  l10n?: {
    trueText?: string
    falseText?: string
  }
}

// Blanks (fill in the blanks)
export interface H5PBlanks {
  text: string
  questions: string[]
  behaviour?: {
    enableRetry?: boolean
    enableSolutionsButton?: boolean
    caseSensitive?: boolean
  }
}

// DragQuestion
export interface H5PDragQuestion {
  question: {
    task: {
      elements: unknown[]
      dropZones: unknown[]
    }
  }
}

// DragText
export interface H5PDragText {
  textField: string
  behaviour?: {
    enableRetry?: boolean
    enableSolutionsButton?: boolean
  }
}

// MarkTheWords
export interface H5PMarkTheWords {
  textField: string
  behaviour?: {
    enableRetry?: boolean
    enableSolutionsButton?: boolean
  }
}

// InteractiveVideo
export interface H5PInteractiveVideo {
  interactiveVideo: {
    video: {
      startScreenOptions?: {
        title?: string
        hideStartTitle?: boolean
      }
      files?: H5PFile[]
    }
    assets?: {
      interactions?: unknown[]
      bookmarks?: unknown[]
      endscreens?: unknown[]
    }
  }
}

// Parsed H5P package
export interface H5PPackage {
  metadata: H5PMetadata
  content: H5PCoursePresentation | H5PInteractiveVideo | Record<string, unknown>
  media: Map<string, string> // path -> blob URL
  libraries: Map<string, unknown> // library name -> library.json content
}


