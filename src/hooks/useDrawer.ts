import { useContext } from 'react';
import DrawerContext from '../contexts/DrawerContextObject';

export function useDrawer() {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawer must be used within DrawerProvider');
  }
  return context;
}
