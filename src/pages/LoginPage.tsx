import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContextObject';
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  InputAdornment,
  CircularProgress,
  Link,
} from '@mui/material';
import {
  Person as PersonIcon,
  Lock as LockIcon,
} from '@mui/icons-material';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth() as {
    login: (email: string, password: string) => Promise<void>;
    isAuthenticated: boolean;
  };
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 100);
    } catch (err) {
      console.error('Erro no login:', err);
      setError('Email ou senha inválidos');
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      {/* Lado Esquerdo - Formulário */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          p: 3,
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ width: '100%', maxWidth: 450 }}>
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 'bold',
                mb: 4,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Login
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email ou Usuário"
                name="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Senha"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 2,
                  mb: 3,
                  py: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {loading ? (
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                ) : (
                  'Entrar'
                )}
              </Button>

              <Typography
                variant="body2"
                align="center"
                sx={{ color: 'text.secondary' }}
              >
                Não tem uma conta?{' '}
                <Link
                  href="#"
                  sx={{
                    color: '#667eea',
                    fontWeight: 600,
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                      color: '#764ba2',
                    },
                  }}
                >
                  Cadastre-se
                </Link>
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Lado Direito - Marca */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontWeight: 'bold',
              mb: 4,
              textShadow: '0 2px 10px rgba(0,0,0,0.2)',
            }}
          >
            GERROT
          </Typography>
          
          <Typography
            variant="h5"
            sx={{
              fontWeight: 300,
              opacity: 0.9,
            }}
          >
            Gestão de Projetos e Clientes
          </Typography>

          <Box
            sx={{
              mt: 6,
              display: 'flex',
              gap: 2,
              justifyContent: 'center',
            }}
          >
            {[...Array(3)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.3)',
                  animation: 'pulse 2s ease-in-out infinite',
                  animationDelay: `${i * 0.3}s`,
                  '@keyframes pulse': {
                    '0%, 100%': {
                      transform: 'scale(1)',
                      opacity: 0.5,
                    },
                    '50%': {
                      transform: 'scale(1.1)',
                      opacity: 0.8,
                    },
                  },
                }}
              />
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -150,
            left: -150,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }}
        />
      </Box>
    </Box>
  );
}
