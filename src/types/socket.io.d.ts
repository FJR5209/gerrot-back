declare module 'socket.io' {
  export interface Server {
    on(event: 'connection', handler: (socket: Socket) => void): void;
    emit(event: string, ...args: any[]): void;
  }

  export interface Socket {
    id: string;
    join(room: string): void;
    leave(room: string): void;
    emit(event: string, data: any): void;
    on(event: string, handler: (data: any) => void): void;
    disconnect(): void;
  }

  export class Server {
    constructor(httpServer: any, options?: {
      cors?: {
        origin?: string | string[];
        methods?: string[];
      };
    });
  }
}

