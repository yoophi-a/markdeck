'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { ChevronDown, ChevronRight, FileText, FolderTree } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { DocumentTreeNode } from '@/shared/lib/content';
import { toBrowseHref, toDocHref } from '@/shared/lib/routes';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ScrollArea } from '@/shared/ui/scroll-area';

interface DocumentTreeProps {
  title?: string;
  nodes: DocumentTreeNode[];
  activeRelativePath?: string;
}

export function DocumentTree({ title = '파일과 폴더', nodes, activeRelativePath }: DocumentTreeProps) {
  const defaultExpandedPaths = useMemo(() => collectExpandedPaths(nodes, activeRelativePath), [nodes, activeRelativePath]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(defaultExpandedPaths));

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
                <TreeNode
                  key={`${node.type}:${node.relativePath}`}
                  node={node}
                  activeRelativePath={activeRelativePath}
                  depth={0}
                  expandedPaths={expandedPaths}
                  onToggle={(relativePath) => {
                    setExpandedPaths((current) => {
                      const next = new Set(current);
                      if (next.has(relativePath)) {
                        next.delete(relativePath);
                      } else {
                        next.add(relativePath);
                      }
                      return next;
                    });
                  }}
                />
              ))}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>
    </aside>
  );
}

function TreeNode({
  node,
  activeRelativePath,
  depth,
  expandedPaths,
  onToggle,
}: {
  node: DocumentTreeNode;
  activeRelativePath?: string;
  depth: number;
  expandedPaths: Set<string>;
  onToggle: (relativePath: string) => void;
}) {
  const isActive = node.type === 'markdown' && node.relativePath === activeRelativePath;
  const href = node.type === 'directory' ? toBrowseHref(node.relativePath) : toDocHref(node.relativePath);
  const isDirectory = node.type === 'directory';
  const hasChildren = isDirectory && Boolean(node.children?.length);
  const isExpanded = isDirectory && expandedPaths.has(node.relativePath);

  return (
    <li className="document-tree-node" data-active={isActive ? 'true' : 'false'}>
      <div className="document-tree-row" style={{ paddingLeft: `${depth * 14}px` }}>
        {isDirectory ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="document-tree-toggle"
            onClick={() => onToggle(node.relativePath)}
            aria-label={isExpanded ? `${node.name} 폴더 접기` : `${node.name} 폴더 펼치기`}
            aria-expanded={isExpanded}
          >
            {hasChildren ? (isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />) : <span className="document-tree-toggle-spacer" />}
          </Button>
        ) : (
          <span className="document-tree-toggle-placeholder" />
        )}
        <span className="document-tree-icon">{isDirectory ? <FolderTree className="size-4" /> : <FileText className="size-4" />}</span>
        <Link href={href as Route} className={`document-tree-link${isActive ? ' active' : ''}`}>
          {node.name}
        </Link>
      </div>
      {isDirectory && node.children && node.children.length > 0 && isExpanded ? (
        <ul className="document-tree-list nested">
          {node.children.map((child) => (
            <TreeNode
              key={`${child.type}:${child.relativePath}`}
              node={child}
              activeRelativePath={activeRelativePath}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function collectExpandedPaths(nodes: DocumentTreeNode[], activeRelativePath?: string) {
  const expanded = new Set<string>();

  function walk(node: DocumentTreeNode): boolean {
    if (node.type === 'markdown') {
      return node.relativePath === activeRelativePath;
    }

    const childHasActive = node.children?.some(walk) ?? false;
    if (childHasActive) {
      expanded.add(node.relativePath);
    }
    return childHasActive;
  }

  nodes.forEach((node) => {
    if (node.type === 'directory' && node.children && node.children.length > 0) {
      if (walk(node) || node.children.some((child) => child.type === 'markdown')) {
        expanded.add(node.relativePath);
      }
    }
  });

  return expanded;
}
