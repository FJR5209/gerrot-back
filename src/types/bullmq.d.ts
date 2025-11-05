declare module 'bullmq' {
  export interface Job<T = any> {
    id?: string;
    data: T;
    progress: number;
    returnvalue?: any;
    failedReason?: string;
    updateProgress(progress: number): Promise<void>;
    getState(): Promise<string>;
  }

  export class Queue<T = any> {
    constructor(name: string, options?: {
      connection?: any;
    });
    add(name: string, data: T, options?: {
      attempts?: number;
      backoff?: {
        type: string;
        delay: number;
      };
    }): Promise<Job<T>>;
    getJob(jobId: string): Promise<Job<T> | undefined>;
  }

  export class Worker<T = any> {
    constructor(
      name: string,
      processor: (job: Job<T>) => Promise<any>,
      options?: {
        connection?: any;
        concurrency?: number;
      }
    );
    on(event: 'completed', handler: (job: Job<T>) => void): void;
    on(event: 'failed', handler: (job: Job<T> | undefined, error: Error) => void): void;
    close(): Promise<void>;
  }
}

