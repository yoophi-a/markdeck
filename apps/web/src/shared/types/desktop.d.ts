export {};

declare global {
  interface Window {
    markdeckDesktop?: {
      getContentRoot: () => Promise<string | null>;
      chooseContentRoot: () => Promise<string | null>;
    };
  }
}
