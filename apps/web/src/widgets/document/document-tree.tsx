'use client';

import { ChevronDown, ChevronRight, FileText, FolderTree, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';
import { useDesktopDocumentTreeQuery } from '@/platform/desktop/renderer/desktop-queries';
import type { DocumentTreeNode } from '@/shared/lib/content-types';
import { toBrowseHref, toDocHref } from '@/shared/lib/routes';
import { readTreeState, writeTreeState } from '@/shared/lib/view-state';
import { AppLink } from '@/shared/ui/app-link';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ScrollArea } from '@/shared/ui/scroll-area';

interface DocumentTreeProps {
  title?: string;
  nodes: DocumentTreeNode[];
  activeRelativePath?: string;
  storageScope?: string;
}

export function DocumentTree({ title = '파일과 폴더', nodes, activeRelativePath, storageScope = 'default' }: DocumentTreeProps) {
  const [treeNodes, setTreeNodes] = useState(nodes);
  const [queryPath, setQueryPath] = useState<string | null>(null);
  const defaultExpandedPaths = useMemo(() => collectExpandedPaths(nodes, activeRelativePath), [nodes, activeRelativePath]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(defaultExpandedPaths));
  const desktopTreeQuery = useDesktopDocumentTreeQuery(queryPath ?? '', 1, Boolean(queryPath));

  useEffect(() => {
    setTreeNodes(nodes);

    const persistedPaths = readTreeState(storageScope);
    const nextPaths = new Set([...defaultExpandedPaths, ...persistedPaths]);
    setExpandedPaths(nextPaths);
  }, [defaultExpandedPaths, nodes, storageScope]);

  useEffect(() => {
    writeTreeState(storageScope, Array.from(expandedPaths));
  }, [expandedPaths, storageScope]);

  useEffect(() => {
    if (!queryPath || !desktopTreeQuery.data) {
      return;
    }

    setTreeNodes((current) => updateNodeChildren(current, queryPath, desktopTreeQuery.data ?? []));
    setExpandedPaths((current) => new Set(current).add(queryPath));
    setQueryPath(null);
  }, [desktopTreeQuery.data, queryPath]);

  if (treeNodes.length === 0) {
    return null;
  }

  async function handleToggle(relativePath: string) {
    const node = findNode(treeNodes, relativePath);
    if (!node || node.type !== 'directory') {
      return;
    }

    const isExpanded = expandedPaths.has(relativePath);
    if (isExpanded) {
      setExpandedPaths((current) => {
        const next = new Set(current);
        next.delete(relativePath);
        return next;
      });
      return;
    }

    if (node.children === undefined) {
      if (isDesktopRenderer()) {
        setQueryPath(relativePath);
        return;
      }

      try {
        const response = await fetch(`/api/tree?path=${encodeURIComponent(relativePath)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch tree nodes');
        }

        const data = (await response.json()) as { nodes?: DocumentTreeNode[] };
        setTreeNodes((current) => updateNodeChildren(current, relativePath, data.nodes ?? []));
      } catch {
        setTreeNodes((current) => updateNodeChildren(current, relativePath, []));
      }
    }

    setExpandedPaths((current) => new Set(current).add(relativePath));
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
        <CardContent className="tree-card-content">
          <ScrollArea className="tree-scroll-area pr-3">
            <ul className="document-tree-list">
              {treeNodes.map((node) => (
                <TreeNode key={`${node.type}:${node.relativePath}`} node={node} activeRelativePath={activeRelativePath} depth={0} expandedPaths={expandedPaths} loadingPaths={queryPath ? new Set([queryPath]) : new Set()} onToggle={handleToggle} />
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
  loadingPaths,
  onToggle,
}: {
  node: DocumentTreeNode;
  activeRelativePath?: string;
  depth: number;
  expandedPaths: Set<string>;
  loadingPaths: Set<string>;
  onToggle: (relativePath: string) => void | Promise<void>;
}) {
  const isActive = node.type === 'markdown' && node.relativePath === activeRelativePath;
  const href = node.type === 'directory' ? toBrowseHref(node.relativePath) : toDocHref(node.relativePath);
  const isDirectory = node.type === 'directory';
  const isLoading = isDirectory && loadingPaths.has(node.relativePath);
  const hasLoadedChildren = isDirectory && node.children !== undefined;
  const hasChildren = isDirectory && (!hasLoadedChildren || Boolean(node.children?.length));
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
            onClick={() => {
              void onToggle(node.relativePath);
            }}
            aria-label={isExpanded ? `${node.name} 폴더 접기` : `${node.name} 폴더 펼치기`}
            aria-expanded={isExpanded}
          >
            {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : hasChildren ? isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" /> : <span className="document-tree-toggle-spacer" />}
          </Button>
        ) : (
          <span className="document-tree-toggle-placeholder" />
        )}
        <span className="document-tree-icon">{isDirectory ? <FolderTree className="size-4" /> : <FileText className="size-4" />}</span>
        <AppLink href={href} className={`document-tree-link${isActive ? ' active' : ''}`} aria-current={isActive ? 'page' : undefined}>
          {node.name}
        </AppLink>
      </div>
      {isDirectory && node.children && node.children.length > 0 && isExpanded ? (
        <ul className="document-tree-list nested">
          {node.children.map((child) => (
            <TreeNode key={`${child.type}:${child.relativePath}`} node={child} activeRelativePath={activeRelativePath} depth={depth + 1} expandedPaths={expandedPaths} loadingPaths={loadingPaths} onToggle={onToggle} />
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
    if (node.type === 'directory') {
      walk(node);
    }
  });

  return expanded;
}

function findNode(nodes: DocumentTreeNode[], relativePath: string): DocumentTreeNode | null {
  for (const node of nodes) {
    if (node.relativePath === relativePath) {
      return node;
    }

    if (node.type === 'directory' && node.children) {
      const child = findNode(node.children, relativePath);
      if (child) {
        return child;
      }
    }
  }

  return null;
}

function updateNodeChildren(nodes: DocumentTreeNode[], relativePath: string, children: DocumentTreeNode[]): DocumentTreeNode[] {
  return nodes.map((node) => {
    if (node.relativePath === relativePath && node.type === 'directory') {
      return {
        ...node,
        children,
      };
    }

    if (node.type === 'directory' && node.children) {
      return {
        ...node,
        children: updateNodeChildren(node.children, relativePath, children),
      };
    }

    return node;
  });
}
