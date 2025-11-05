import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { DrawerProvider } from './contexts/DrawerContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Sidebar } from './components/SidebarMUI';
import { LoginPage, ProjectsPage, DashboardPage, ClientsPage, UsersPage, ProjectDetail } from './pages';
import AgendaPage from './pages/AgendaPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useDrawer } from './hooks/useDrawer';
import { ThemeModeProvider } from './contexts/ThemeModeContext';

// Tema é gerenciado pelo ThemeModeProvider (light/dark com persistência)

const drawerWidth = 280;

function AppRoutes() {
  const { isOpen } = useDrawer();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/projects"
          element={
            <PrivateRoute>
              <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <Box 
                  component="main" 
                  sx={{ 
                    flexGrow: 1,
                    pt: { xs: '80px', lg: 3 },
                    px: { xs: 0, lg: 3 },
                    pb: { xs: 0, lg: 3 },
                    pl: { xs: 0, lg: isOpen ? 3 : '72px' },
                    ml: { lg: isOpen ? `${drawerWidth}px` : 0 },
                    transition: 'margin 0.3s, padding 0.3s',
                  }}
                >
                  <ProjectsPage />
                </Box>
              </Box>
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <Box 
                  component="main" 
                  sx={{ 
                    flexGrow: 1,
                    pt: { xs: '80px', lg: 3 },
                    px: { xs: 0, lg: 3 },
                    pb: { xs: 0, lg: 3 },
                    pl: { xs: 0, lg: isOpen ? 3 : '72px' },
                    ml: { lg: isOpen ? `${drawerWidth}px` : 0 },
                    transition: 'margin 0.3s, padding 0.3s',
                  }}
                >
                  <DashboardPage />
                </Box>
              </Box>
            </PrivateRoute>
          }
        />
        <Route
          path="/agenda"
          element={
            <PrivateRoute>
              <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <Box 
                  component="main" 
                  sx={{ 
                    flexGrow: 1,
                    pt: { xs: '80px', lg: 3 },
                    px: { xs: 0, lg: 3 },
                    pb: { xs: 0, lg: 3 },
                    pl: { xs: 0, lg: isOpen ? 3 : '72px' },
                    ml: { lg: isOpen ? `${drawerWidth}px` : 0 },
                    transition: 'margin 0.3s, padding 0.3s',
                  }}
                >
                  <AgendaPage />
                </Box>
              </Box>
            </PrivateRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <PrivateRoute>
              <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <Box 
                  component="main" 
                  sx={{ 
                    flexGrow: 1,
                    pt: { xs: '80px', lg: 3 },
                    px: { xs: 0, lg: 3 },
                    pb: { xs: 0, lg: 3 },
                    pl: { xs: 0, lg: isOpen ? 3 : '72px' },
                    ml: { lg: isOpen ? `${drawerWidth}px` : 0 },
                    transition: 'margin 0.3s, padding 0.3s',
                  }}
                >
                  <ClientsPage />
                </Box>
              </Box>
            </PrivateRoute>
          }
        />
        <Route
          path="/users"
          element={
            <PrivateRoute>
              <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <Box 
                  component="main" 
                  sx={{ 
                    flexGrow: 1,
                    pt: { xs: '80px', lg: 3 },
                    px: { xs: 0, lg: 3 },
                    pb: { xs: 0, lg: 3 },
                    pl: { xs: 0, lg: isOpen ? 3 : '72px' },
                    ml: { lg: isOpen ? `${drawerWidth}px` : 0 },
                    transition: 'margin 0.3s, padding 0.3s',
                  }}
                >
                  <UsersPage />
                </Box>
              </Box>
            </PrivateRoute>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <PrivateRoute>
              <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <Box 
                  component="main" 
                  sx={{ 
                    flexGrow: 1,
                    pt: { xs: '80px', lg: 3 },
                    px: { xs: 0, lg: 3 },
                    pb: { xs: 0, lg: 3 },
                    pl: { xs: 0, lg: isOpen ? 3 : '72px' },
                    ml: { lg: isOpen ? `${drawerWidth}px` : 0 },
                    transition: 'margin 0.3s, padding 0.3s',
                  }}
                >
                  <ProjectDetail />
                </Box>
              </Box>
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeModeProvider>
        <DrawerProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </DrawerProvider>
      </ThemeModeProvider>
    </ErrorBoundary>
  );
}

export default App;
