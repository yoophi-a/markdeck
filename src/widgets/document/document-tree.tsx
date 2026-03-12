import Link from 'next/link';
import type { Route } from 'next';
import { FileText, FolderTree } from 'lucide-react';

import type { DocumentTreeNode } from '@/shared/lib/content';
import { toBrowseHref, toDocHref } from '@/shared/lib/routes';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ScrollArea } from '@/shared/ui/scroll-area';

interface DocumentTreeProps {
  title?: string;
  nodes: DocumentTreeNode[];
  activeRelativePath?: string;
}

export function DocumentTree({ title = '파일과 폴더', nodes, activeRelativePath }: DocumentTreeProps) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <aside>
      <Card className="tree-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="size-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[70vh] pr-3">
            <ul className="document-tree-list">
              {nodes.map((node) => (
                <TreeNode key={`${node.type}:${node.relativePath}`} node={node} activeRelativePath={activeRelativePath} depth={0} />
              ))}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>
    </aside>
  );
}

function TreeNode({ node, activeRelativePath, depth }: { node: DocumentTreeNode; activeRelativePath?: string; depth: number }) {
  const isActive = node.type === 'markdown' && node.relativePath === activeRelativePath;
  const href = node.type === 'directory' ? toBrowseHref(node.relativePath) : toDocHref(node.relativePath);

  return (
    <li className="document-tree-node" data-active={isActive ? 'true' : 'false'}>
      <div className="document-tree-row" style={{ paddingLeft: `${depth * 14}px` }}>
        <span className="document-tree-icon">{node.type === 'directory' ? <FolderTree className="size-4" /> : <FileText className="size-4" />}</span>
        <Link href={href as Route} className={`document-tree-link${isActive ? ' active' : ''}`}>
          {node.name}
        </Link>
      </div>
      {node.type === 'directory' && node.children && node.children.length > 0 ? (
        <ul className="document-tree-list nested">
          {node.children.map((child) => (
            <TreeNode key={`${child.type}:${child.relativePath}`} node={child} activeRelativePath={activeRelativePath} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
