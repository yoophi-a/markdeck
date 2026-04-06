export type EntryType = 'directory' | 'markdown' | 'file';

export interface BrowserEntry {
  name: string;
  relativePath: string;
  type: EntryType;
  size?: number;
  updatedAt?: string;
}

export interface DocumentTreeNode {
  name: string;
  relativePath: string;
  type: 'directory' | 'markdown';
  children?: DocumentTreeNode[];
}

export interface MarkdownDocument {
  absolutePath: string;
  relativePath: string;
  content: string;
  title: string;
  size: number;
  updatedAt: string;
}

export interface SearchResult {
  relativePath: string;
  title: string;
  snippet: string;
  size: number;
  updatedAt: string;
}

export interface AssetPayload {
  relativePath: string;
  contentType: string;
  dataBase64: string;
  size: number;
}
