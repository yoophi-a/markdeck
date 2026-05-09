export interface ReaderLayoutSettings {
  showTree: boolean;
  showFeedback: boolean;
  showToc: boolean;
  isDocumentMaximized: boolean;
  treeWidth: number;
  rightPanelWidth: number;
}

export type PersistedReaderLayoutSettings = Partial<ReaderLayoutSettings> & {
  tocWidth?: number;
  feedbackWidth?: number;
};

export const MIN_READER_PANEL_WIDTH = 220;
export const MAX_READER_PANEL_WIDTH = 420;

export const DEFAULT_READER_LAYOUT_SETTINGS: ReaderLayoutSettings = {
  showTree: true,
  showFeedback: true,
  showToc: true,
  isDocumentMaximized: false,
  treeWidth: 280,
  rightPanelWidth: 280,
};

export function clampReaderPanelWidth(width: number) {
  return Math.min(MAX_READER_PANEL_WIDTH, Math.max(MIN_READER_PANEL_WIDTH, Math.round(width)));
}

export function normalizeReaderLayoutSettings(parsed: PersistedReaderLayoutSettings | null | undefined): ReaderLayoutSettings {
  if (!parsed) {
    return { ...DEFAULT_READER_LAYOUT_SETTINGS };
  }

  return {
    showTree: parsed.showTree ?? DEFAULT_READER_LAYOUT_SETTINGS.showTree,
    showFeedback: parsed.showFeedback ?? DEFAULT_READER_LAYOUT_SETTINGS.showFeedback,
    showToc: parsed.showToc ?? DEFAULT_READER_LAYOUT_SETTINGS.showToc,
    isDocumentMaximized: parsed.isDocumentMaximized ?? DEFAULT_READER_LAYOUT_SETTINGS.isDocumentMaximized,
    treeWidth: clampReaderPanelWidth(parsed.treeWidth ?? DEFAULT_READER_LAYOUT_SETTINGS.treeWidth),
    rightPanelWidth: clampReaderPanelWidth(parsed.rightPanelWidth ?? parsed.feedbackWidth ?? parsed.tocWidth ?? DEFAULT_READER_LAYOUT_SETTINGS.rightPanelWidth),
  };
}

export function hasReaderRightPanel(settings: Pick<ReaderLayoutSettings, 'showFeedback' | 'showToc'>) {
  return settings.showFeedback || settings.showToc;
}

export function resolveReaderLayoutClassName(settings: Pick<ReaderLayoutSettings, 'showTree' | 'showFeedback' | 'showToc' | 'isDocumentMaximized'>) {
  const classNames = ['document-layout'];
  const hasRightPanel = hasReaderRightPanel(settings);

  if (settings.showTree && hasRightPanel) {
    classNames.push('with-tree');
  }

  if (settings.showTree) {
    classNames.push('has-tree');
  }

  if (hasRightPanel) {
    classNames.push('has-toc');
  }

  if (settings.isDocumentMaximized) {
    classNames.push('is-maximized');
  }

  return classNames.join(' ');
}
