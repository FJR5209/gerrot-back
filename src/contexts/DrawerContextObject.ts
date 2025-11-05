import { createContext } from 'react';

export interface DrawerContextType {
  isOpen: boolean;
  toggleDrawer: () => void;
  isMobile: boolean;
}

export const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export default DrawerContext;
