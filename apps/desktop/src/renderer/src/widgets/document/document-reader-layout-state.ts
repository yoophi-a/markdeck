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

export function normalizeReaderLayoutSettings(parsed: PersistedReaderLayoutSettings | null): ReaderLayoutSettings {
  if (!parsed) {
    return DEFAULT_READER_LAYOUT_SETTINGS;
  }

  return {
    showTree: parsed.showTree ?? true,
    showFeedback: parsed.showFeedback ?? true,
    showToc: parsed.showToc ?? true,
    isDocumentMaximized: parsed.isDocumentMaximized ?? false,
    treeWidth: clampReaderPanelWidth(parsed.treeWidth ?? DEFAULT_READER_LAYOUT_SETTINGS.treeWidth),
    rightPanelWidth: clampReaderPanelWidth(parsed.rightPanelWidth ?? parsed.feedbackWidth ?? parsed.tocWidth ?? DEFAULT_READER_LAYOUT_SETTINGS.rightPanelWidth),
  };
}

export function hasReaderRightPanel(settings: Pick<ReaderLayoutSettings, 'showFeedback' | 'showToc'>) {
  return settings.showFeedback || settings.showToc;
}

export function createReaderLayoutClassName(settings: ReaderLayoutSettings) {
  const hasRightPanel = hasReaderRightPanel(settings);
  const classNames = ['document-layout'];

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

export function createReaderLayoutStyle(settings: Pick<ReaderLayoutSettings, 'treeWidth' | 'rightPanelWidth'>) {
  return {
    '--document-tree-width': `${settings.treeWidth}px`,
    '--document-toc-width': `${settings.rightPanelWidth}px`,
  };
}
