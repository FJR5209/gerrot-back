import { useState } from 'react';
import type { ScriptVersion } from '../types/version';
import {
  Box,
  Stack,
  Typography,
  Button,
  IconButton,
  TextField,
  Alert,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Check as CheckIcon,
} from '@mui/icons-material';

interface VersionsHistoryProps {
  versions: ScriptVersion[];
  loading: boolean;
  error: string | null;
  isFromCache: boolean;
  currentVersionId?: string;
  onSelectVersion: (version: ScriptVersion) => void;
  onCreateVersion: (content: string) => Promise<void>;
  onUpdateVersion: (id: string, content: string) => Promise<void>;
  onDeleteVersion: (id: string) => Promise<void>;
  onRefetch: () => Promise<void>;
}

/**
 * Componente de histórico de versões com cache localStorage
 * 
 * Funcionalidades:
 * - Lista de versões ordenada por versionNumber (decrescente)
 * - Badge "Em cache" quando exibindo dados do localStorage
 * - Botão "Recarregar" para forçar fetch do servidor
 * - Ações de criar, editar e deletar versões
 * - Estados de loading e erro
 */
export function VersionsHistory({
  versions,
  loading,
  error,
  isFromCache,
  currentVersionId,
  onSelectVersion,
  onCreateVersion,
  onUpdateVersion,
  onDeleteVersion,
  onRefetch,
}: VersionsHistoryProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [newContent, setNewContent] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleCreate = async () => {
    if (!newContent.trim()) return;
    
    setActionLoading(true);
    try {
      await onCreateVersion(newContent);
      setNewContent('');
      setIsCreating(false);
    } catch (err) {
      console.error('Erro ao criar versão:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return;
    
    setActionLoading(true);
    try {
      await onUpdateVersion(id, editContent);
      setIsEditing(null);
      setEditContent('');
    } catch (err) {
      console.error('Erro ao atualizar versão:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta versão?')) return;
    
    setActionLoading(true);
    try {
      await onDeleteVersion(id);
    } catch (err) {
      console.error('Erro ao deletar versão:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const startEdit = (version: ScriptVersion) => {
    setIsEditing(version.id);
    setEditContent(version.content);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header com título e ações */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon sx={{ color: 'primary.main' }} fontSize="small" />
            Histórico de Versões
          </Typography>
          {isFromCache && (
            <Box component="span" sx={{ px: 1, py: 0.5, borderRadius: 1, fontSize: 12, bgcolor: 'warning.light', color: 'warning.dark', border: '1px solid', borderColor: 'warning.main' }}>
              Em cache
            </Box>
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            onClick={onRefetch}
            disabled={loading}
            variant="outlined"
            startIcon={<RefreshIcon sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Recarregar
          </Button>
          {!isCreating && (
            <Button
              onClick={() => setIsCreating(true)}
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': { opacity: 0.95 },
              }}
            >
              Nova
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Erro */}
      {error && (
        <Alert severity="error">{error}</Alert>
      )}

      {/* Form de criação */}
      {isCreating && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2">Nova Versão</Typography>
            <IconButton
              onClick={() => {
                setIsCreating(false);
                setNewContent('');
              }}
              size="small"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          <TextField
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Conteúdo da nova versão..."
            fullWidth
            multiline
            minRows={5}
          />
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1.5 }}>
            <Button
              onClick={() => {
                setIsCreating(false);
                setNewContent('');
              }}
              disabled={actionLoading}
              sx={{ textTransform: 'none' }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={actionLoading || !newContent.trim()}
              variant="contained"
              sx={{
                textTransform: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': { opacity: 0.95 },
              }}
            >
              {actionLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Lista de versões */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {loading && versions.length === 0 ? (
          <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>
            <CircularProgress size={24} sx={{ mr: 1 }} /> Carregando versões...
          </Box>
        ) : versions.length === 0 ? (
          <Paper variant="outlined" sx={{ textAlign: 'center', py: 6 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 2, background: 'linear-gradient(135deg, rgba(102,126,234,0.12) 0%, rgba(118,75,162,0.12) 100%)', mb: 1.5 }}>
              <AccessTimeIcon sx={{ color: 'primary.main' }} />
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>Nenhuma versão criada</Typography>
            <Typography variant="caption" color="text.secondary">Clique em "Nova" para criar a primeira versão</Typography>
          </Paper>
        ) : (
          versions.map((version) => {
            const isActive = version.id === currentVersionId;
            const isEditingThis = isEditing === version.id;

            return (
              <Paper
                key={version.id}
                variant="outlined"
                sx={{
                  p: 2,
                  transition: 'all 0.2s',
                  borderColor: isActive ? 'primary.light' : undefined,
                  background: isActive ? 'linear-gradient(135deg, rgba(102,126,234,0.06) 0%, rgba(118,75,162,0.06) 100%)' : 'background.paper',
                }}
              >
                {isEditingThis ? (
                  <>
                    <TextField
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      fullWidth
                      multiline
                      minRows={5}
                    />
                    <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1.5 }}>
                      <Button
                        onClick={() => {
                          setIsEditing(null);
                          setEditContent('');
                        }}
                        disabled={actionLoading}
                        sx={{ textTransform: 'none' }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => handleUpdate(version.id)}
                        disabled={actionLoading || !editContent.trim()}
                        variant="contained"
                        startIcon={<CheckIcon />}
                        sx={{
                          textTransform: 'none',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          '&:hover': { opacity: 0.95 },
                        }}
                      >
                        {actionLoading ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </Stack>
                  </>
                ) : (
                  <>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                        {isActive && (
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                        )}
                        <Button
                          onClick={() => onSelectVersion(version)}
                          sx={{
                            fontWeight: 600,
                            color: isActive ? 'primary.dark' : 'text.primary',
                            textTransform: 'none',
                            p: 0,
                            minWidth: 0,
                          }}
                        >
                          Versão #{version.versionNumber}
                        </Button>
                      </Stack>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => startEdit(version)} disabled={actionLoading} title="Editar">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(version.id)} disabled={actionLoading} title="Deletar" color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      {new Date(version.createdAt).toLocaleString('pt-BR')}
                    </Typography>
                    <Box sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 13, color: 'text.secondary', bgcolor: 'grey.50', border: 1, borderColor: 'grey.100', borderRadius: 1, p: 1 }}>
                      {version.content || '(vazio)'}
                    </Box>
                  </>
                )}
              </Paper>
            );
          })
        )}
      </Box>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
      `}</style>
    </Box>
  );
}
