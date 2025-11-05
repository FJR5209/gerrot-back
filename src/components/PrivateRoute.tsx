import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContextObject';
import type { ReactNode } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';

interface PrivateRouteProps {
  children: ReactNode;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box minHeight="100vh" bgcolor="background.default" display="flex" alignItems="center" justifyContent="center">
        <Stack direction="column" spacing={2} alignItems="center">
          <CircularProgress color="secondary" />
          <Typography color="text.secondary">Carregando...</Typography>
        </Stack>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
