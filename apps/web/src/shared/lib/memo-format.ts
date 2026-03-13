import { MARKDECK_ANNOTATION_SCHEMA_VERSION, type AnnotationDocument, type DocumentAnnotation } from '@/shared/lib/annotations';

export interface MemoOperation {
  op: 'add';
  annotation: DocumentAnnotation;
}

export interface MemoFile {
  version: typeof MARKDECK_ANNOTATION_SCHEMA_VERSION;
  documentPath: string;
  sourceUpdatedAt?: string;
  strategy: 'annotation-diff';
  operations: MemoOperation[];
}

export function getMemoFileName(documentPath: string) {
  const parts = documentPath.split('/');
  const fileName = parts.pop() || 'document.md';
  return `${fileName}.memo`;
}

export function toMemoFile(document: AnnotationDocument): MemoFile {
  return {
    version: MARKDECK_ANNOTATION_SCHEMA_VERSION,
    documentPath: document.documentPath,
    sourceUpdatedAt: document.sourceUpdatedAt,
    strategy: 'annotation-diff',
    operations: document.annotations.map((annotation) => ({
      op: 'add',
      annotation,
    })),
  };
}

export function fromMemoFile(file: MemoFile): AnnotationDocument {
  return {
    schemaVersion: file.version,
    documentPath: file.documentPath,
    sourceUpdatedAt: file.sourceUpdatedAt,
    annotations: file.operations.filter((operation) => operation.op === 'add').map((operation) => operation.annotation),
  };
}

export function stringifyMemoFile(document: AnnotationDocument) {
  return `${JSON.stringify(toMemoFile(document), null, 2)}\n`;
}
