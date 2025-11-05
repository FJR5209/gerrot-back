declare module 'express' {
  export interface Request { [key: string]: any; }
  export interface Response { [key: string]: any; }
  export type NextFunction = (...args: any[]) => any;
  export interface Router {
    get: any; post: any; patch: any; delete: any; use: any;
  }
  export interface ExpressApp extends Router {}
  function express(): ExpressApp;
  namespace express {
    function Router(): Router;
    function json(): any;
    function static(root: string): any;
  }
  export default express;
}

declare module 'multer' {
  interface StorageEngine {}
  interface MulterOptions { storage?: StorageEngine; limits?: any; fileFilter?: any }
  interface DiskStorageOptions { destination?: any; filename?: any }
  interface MulterInstance { single: (field: string) => any }
  function multer(opts?: MulterOptions): MulterInstance;
  namespace multer {
    function diskStorage(opts: DiskStorageOptions): StorageEngine;
    function memoryStorage(): StorageEngine;
  }
  export default multer;
}
