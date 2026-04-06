import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from '@/App';
import '@/globals.css';

if (import.meta.env.DEV) {
  void loadReactGrab();
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

async function loadReactGrab() {
  const restore = blockReactGrabGoogleFont();

  try {
    await import('react-grab');
  } finally {
    restore();
  }
}

function blockReactGrabGoogleFont() {
  const originalAppendChild = document.head.appendChild.bind(document.head);
  const originalInsertBefore = document.head.insertBefore.bind(document.head);

  const shouldBlock = (node: Node) =>
    node instanceof HTMLLinkElement &&
    node.rel === 'stylesheet' &&
    typeof node.href === 'string' &&
    node.href.includes('fonts.googleapis.com');

  document.head.appendChild = ((node: Node) => {
    if (shouldBlock(node)) {
      return node;
    }

    return originalAppendChild(node);
  }) as typeof document.head.appendChild;

  document.head.insertBefore = ((node: Node, child: Node | null) => {
    if (shouldBlock(node)) {
      return node;
    }

    return originalInsertBefore(node, child);
  }) as typeof document.head.insertBefore;

  return () => {
    document.head.appendChild = originalAppendChild;
    document.head.insertBefore = originalInsertBefore;
  };
}
