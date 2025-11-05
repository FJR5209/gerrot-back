import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Dashboard,
  Movie,
  Business,
  People,
  Logout,
  Menu as MenuIcon,
  ChevronLeft,
  DarkMode,
  LightMode,
  CalendarMonth,
} from '@mui/icons-material';
import { useDrawer } from '../hooks/useDrawer';
import { useAuth } from '../contexts/AuthContextObject';
import { useThemeMode } from '../contexts/ThemeModeContext';

const drawerWidth = 280;

const menuItems = [
  {
    section: 'MENU',
    items: [
      { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
      { text: 'Projetos', icon: <Movie />, path: '/projects' },
      { text: 'Agenda', icon: <CalendarMonth />, path: '/agenda' },
    ],
  },
  {
    section: 'GESTÃO',
    items: [
      { text: 'Clientes', icon: <Business />, path: '/clients' },
      { text: 'Usuários', icon: <People />, path: '/users' },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOpen, toggleDrawer, isMobile } = useDrawer();
  const { logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      toggleDrawer();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const drawer = (
    <Box>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          GERROT
        </Typography>
        <Box>
          <IconButton onClick={toggleMode} sx={{ color: 'white', mr: 0.5 }} title={mode === 'dark' ? 'Tema claro' : 'Tema escuro'}>
            {mode === 'dark' ? <LightMode /> : <DarkMode />}
          </IconButton>
          <IconButton onClick={toggleDrawer} sx={{ color: 'white' }} title="Fechar menu">
            <ChevronLeft />
          </IconButton>
        </Box>
      </Box>

      {/* Menu Items */}
      <Box sx={{ overflow: 'auto' }}>
        {menuItems.map((section) => (
          <Box key={section.section} sx={{ mt: 2 }}>
            <Typography
              variant="overline"
              sx={{
                px: 2,
                color: 'text.secondary',
                fontWeight: 'bold',
                fontSize: '0.75rem',
              }}
            >
              {section.section}
            </Typography>
            <List sx={{ px: 1 }}>
              {section.items.map((item) => {
                const isSelected = location.pathname === item.path;
                return (
                  <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      onClick={() => handleNavigation(item.path)}
                      selected={isSelected}
                      sx={{
                        borderRadius: 1,
                        '&.Mui-selected': {
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            opacity: 0.9,
                          },
                        },
                        '&:hover': {
                          backgroundColor: 'rgba(102, 126, 234, 0.08)',
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: isSelected ? 'white' : 'inherit',
                          minWidth: 40,
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.text} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* Logout Button */}
      <Box sx={{ position: 'absolute', bottom: 0, width: '100%', p: 1 }}>
        <Divider sx={{ mb: 1 }} />
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 1,
            mx: 1,
            '&:hover': {
              backgroundColor: 'rgba(244, 67, 54, 0.08)',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Sair" />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Menu Button - Only shown on mobile or when drawer is closed on desktop */}
      {(isMobile || !isOpen) && (
        <IconButton
          onClick={toggleDrawer}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: (theme) => theme.zIndex.appBar + 1,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: 2,
            '&:hover': {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              opacity: 0.9,
              boxShadow: 3,
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Mobile Drawer - Temporary */}
      <Drawer
        variant="temporary"
        open={isOpen && isMobile}
        onClose={toggleDrawer}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop Drawer - Persistent */}
      <Drawer
        variant="persistent"
        open={isOpen && !isMobile}
        sx={{
          display: { xs: 'none', lg: 'block' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
}
