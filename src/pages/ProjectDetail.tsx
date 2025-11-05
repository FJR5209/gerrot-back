import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContextObject';
import { useProjectVersions } from '../hooks/useProjectVersions';
import { VersionsHistory } from '../components/VersionsHistory';
import { AiSidebar } from '../components/AiSidebar';
import { PdfExportButton } from '../components/PdfExportButton';
import type { ScriptVersion } from '../types/version';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface Project {
  id: string;
  title: string;
  description: string;
}

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [currentVersion, setCurrentVersion] = useState<ScriptVersion | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hook de gestão de versões com cache
  const {
    versions,
    loading: versionsLoading,
    error: versionsError,
    isFromCache,
    refetch: refetchVersions,
    createVersion,
    updateVersion,
    deleteVersion,
  } = useProjectVersions(projectId || '', token);

  const loadProject = useCallback(async () => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      setProject(response.data);
      setLoading(false);
    } catch {
      setError('Erro ao carregar projeto');
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId, loadProject]);

  // Atualizar versão atual quando lista de versões mudar
  useEffect(() => {
    if (versions.length > 0 && !currentVersion) {
      setCurrentVersion(versions[0]); // Seleciona a mais recente
      setEditContent(versions[0].content);
    }
  }, [versions, currentVersion]);

  const handleSelectVersion = (version: ScriptVersion) => {
    setCurrentVersion(version);
    setEditContent(version.content);
    setEditMode(false);
  };

  const handleSaveEdit = async () => {
    if (!currentVersion) return;
    
    try {
      await updateVersion(currentVersion.id, editContent);
      setEditMode(false);
    } catch (err) {
      console.error('Erro ao atualizar versão:', err);
    }
  };

  const handleSaveGenerated = async (generatedText: string) => {
    try {
      await createVersion(generatedText);
    } catch (err) {
      console.error('Erro ao salvar versão gerada:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !project) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Projeto não encontrado'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Button
                  onClick={() => navigate('/projects')}
                  startIcon={<ArrowBackIcon />}
                  sx={{
                    color: 'text.secondary',
                    textTransform: 'none',
                    mb: { xs: 1, sm: 1 },
                    '&:hover': { color: '#764ba2' },
                  }}
                >
                  Voltar para projetos
                </Button>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: { xs: 40, sm: 48 },
                      height: { xs: 40, sm: 48 },
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Box component="span" sx={{ width: 20, height: 20, bgcolor: 'transparent' }}>
                      {/* Ícone decorativo */}
                      <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="#667eea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Box>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h5" noWrap sx={{ fontWeight: 600 }}>
                      {project.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {project.description}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                {currentVersion && (
                  <PdfExportButton projectId={projectId!} versionId={currentVersion.id} />
                )}
                {editMode ? (
                  <Stack direction="row" spacing={1}>
                    <Button
                      onClick={() => {
                        setEditMode(false);
                        setEditContent(currentVersion?.content || '');
                      }}
                      variant="outlined"
                      startIcon={<CloseIcon />}
                      sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      variant="contained"
                      startIcon={<CheckIcon />}
                      sx={{
                        textTransform: 'none',
                        borderRadius: 999,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': { opacity: 0.95 },
                      }}
                    >
                      Salvar
                    </Button>
                  </Stack>
                ) : (
                  <Button
                    onClick={() => setEditMode(true)}
                    variant="contained"
                    startIcon={<EditIcon />}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 999,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': { opacity: 0.95 },
                    }}
                  >
                    Editar
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>
        </Paper>

        {/* Editor/Viewer */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 3 }, bgcolor: 'background.default' }}>
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            {editMode ? (
              <TextField
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Digite o conteúdo do roteiro..."
                fullWidth
                multiline
                minRows={14}
                sx={{
                  '& .MuiInputBase-root': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' },
                }}
              />
            ) : (
              <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                {currentVersion ? (
                  <Box component="pre" sx={{ whiteSpace: 'pre-wrap', m: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif', fontSize: { xs: 14, sm: 16 }, color: 'text.primary', lineHeight: 1.7 }}>
                    {currentVersion.content}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', color: 'text.secondary', py: { xs: 6, sm: 10 } }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 3, background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%)', mb: 2 }}>
                      <Box component="span" sx={{ width: 36, height: 36, color: '#667eea' }}>
                        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="#667eea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Box>
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>Nenhuma versão criada ainda</Typography>
                    <Typography variant="body2">Use a IA para gerar um roteiro ou crie manualmente</Typography>
                  </Box>
                )}
              </Paper>
            )}

            {/* Histórico de Versões */}
            <Box sx={{ mt: { xs: 3, sm: 4 } }}>
              <VersionsHistory
                versions={versions}
                loading={versionsLoading}
                error={versionsError}
                isFromCache={isFromCache}
                currentVersionId={currentVersion?.id}
                onSelectVersion={handleSelectVersion}
                onCreateVersion={createVersion}
                onUpdateVersion={updateVersion}
                onDeleteVersion={deleteVersion}
                onRefetch={refetchVersions}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* AI Sidebar - oculto em telas pequenas */}
      <Box sx={{ display: { xs: 'none', lg: 'block' }, borderLeft: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <AiSidebar
          projectId={projectId!}
          currentScript={currentVersion?.content}
          onSaveGenerated={handleSaveGenerated}
        />
      </Box>
    </Box>
  );
}
