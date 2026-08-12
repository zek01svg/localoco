/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_URL: string;
}

interface Window {
  __env?: {
    VITE_URL?: string;
  };
}