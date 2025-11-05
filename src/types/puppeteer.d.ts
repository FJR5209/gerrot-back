declare module 'puppeteer' {
  export interface LaunchOptions {
    headless?: boolean;
    args?: string[];
  }

  export interface PDFOptions {
    format?: string;
    printBackground?: boolean;
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
  }

  export interface Browser {
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }

  export interface Page {
    setContent(html: string, options?: { waitUntil?: string }): Promise<void>;
    pdf(options?: PDFOptions): Promise<Buffer>;
  }

  export function launch(options?: LaunchOptions): Promise<Browser>;
}

