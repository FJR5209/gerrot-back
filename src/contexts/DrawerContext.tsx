import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import DrawerContext from './DrawerContextObject';

export function DrawerProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isOpen = isMobile ? mobileOpen : desktopOpen;

  const toggleDrawer = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopOpen(!desktopOpen);
    }
  };

  return (
    <DrawerContext.Provider value={{ isOpen, toggleDrawer, isMobile }}>
      {children}
    </DrawerContext.Provider>
  );
}
