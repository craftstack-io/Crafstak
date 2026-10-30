/// <reference types="vite/client" />

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(event: string, listener: (...args: any[]) => void): void;
  removeListener?(event: string, listener: (...args: any[]) => void): void;
}

declare global {
  interface ImportMetaEnv {
    readonly VITE_CHAIN_NAME?: string;
    readonly VITE_CHAIN_ID?: string;
    readonly VITE_RPC_URL?: string;
    readonly VITE_CONTRACT_ADDRESS?: string;
    readonly VITE_EXPLORER_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};
