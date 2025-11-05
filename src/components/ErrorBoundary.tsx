import React from 'react';
import { Box, Paper, Typography, Button, Container, Stack, Avatar, Alert } from '@mui/material';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Aqui você pode enviar para um serviço de logs (Sentry, etc)
    console.error('App Error Boundary:', error, errorInfo);
  }

  handleReload = () => {
    // Uma recarga simples resolve a maioria dos estados corrompidos (Fast Refresh, etc.)
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box minHeight="100vh" bgcolor="background.default" display="flex" alignItems="center" justifyContent="center" p={3}>
          <Container maxWidth="sm">
            <Paper elevation={1} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
              <Stack alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: 'error.light', width: 48, height: 48 }}>
                  {/* Ícone simples de alerta via emoji para evitar dependência extra */}
                  <Typography component="span" color="error.main" fontWeight={700}>!</Typography>
                </Avatar>
                <Typography variant="h6">Algo deu errado</Typography>
                <Typography variant="body2" color="text.secondary">
                  O aplicativo encontrou um erro inesperado. Você pode tentar novamente.
                </Typography>
                <Button
                  onClick={this.handleReload}
                  variant="contained"
                  sx={{
                    mt: 1,
                    borderRadius: '999px',
                    textTransform: 'none',
                    px: 3,
                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: 'none',
                    '&:hover': { opacity: 0.95, boxShadow: 'none', background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)' },
                  }}
                >
                  Recarregar
                </Button>
                {import.meta.env.MODE !== 'production' && this.state.error && (
                  <Alert severity="error" variant="outlined" sx={{ textAlign: 'left', width: '100%', mt: 2, whiteSpace: 'pre-wrap' }}>
                    {String(this.state.error.stack || this.state.error.message)}
                  </Alert>
                )}
              </Stack>
            </Paper>
          </Container>
        </Box>
      );
    }
    return this.props.children;
  }
}
