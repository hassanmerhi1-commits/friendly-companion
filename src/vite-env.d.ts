/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare global {
  interface Window {
    electronAPI?: {
      isElectron?: boolean;
      print?: {
        html: (
          html: string,
          options?: { silent?: boolean; printBackground?: boolean }
        ) => Promise<{ success: boolean; error?: string | null }>;
      };
    };
  }
}

export {};
