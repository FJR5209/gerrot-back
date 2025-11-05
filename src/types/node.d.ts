declare module 'path' {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
  export function basename(path: string, ext?: string): string;
  export function extname(path: string): string;
}

declare module 'fs' {
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
}

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
    PORT?: string;
    NODE_ENV?: string;
    DATABASE_URL?: string;
    JWT_SECRET?: string;
    GEMINI_API_KEY?: string;
    AWS_S3_BUCKET?: string;
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
  }

  interface Process {
    env: ProcessEnv;
    cwd(): string;
    exit(code?: number): never;
  }
}

// declare const process: NodeJS.Process; // Já declarado pelo @types/node

