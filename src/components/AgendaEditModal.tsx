import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { Project } from '../api/projects';

interface AgendaEditModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectId: string, data: AgendaData) => Promise<void>;
}

interface AgendaData {
  recordingDate?: string;
  deliveryDeadline?: string;
  estimatedDuration?: number;
  location?: string;
  notes?: string;
}

export function AgendaEditModal({ project, isOpen, onClose, onSave }: AgendaEditModalProps) {
  const [formData, setFormData] = useState<AgendaData>({
    recordingDate: '',
    deliveryDeadline: '',
    estimatedDuration: undefined,
    location: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Converter ISO 8601 para datetime-local format (YYYY-MM-DDTHH:mm)
  const toDateTimeLocal = (isoString?: string): string => {
    if (!isoString) return '';
    return new Date(isoString).toISOString().slice(0, 16);
  };

  // Preencher formulário quando o modal abre
  useEffect(() => {
    if (project && isOpen) {
      setFormData({
        recordingDate: toDateTimeLocal(project.recordingDate),
        deliveryDeadline: toDateTimeLocal(project.deliveryDeadline),
        estimatedDuration: project.estimatedDuration,
        location: project.location || '',
        notes: project.notes || '',
      });
      setError(null);
    }
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    // Validações
    if (formData.estimatedDuration !== undefined && formData.estimatedDuration < 1) {
      setError('Duração estimada deve ser no mínimo 1 minuto');
      return;
    }
    if (formData.location && formData.location.length > 200) {
      setError('Local deve ter no máximo 200 caracteres');
      return;
    }
    if (formData.notes && formData.notes.length > 1000) {
      setError('Observações devem ter no máximo 1000 caracteres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Converter datetime-local para ISO 8601 e preparar dados
      const dataToSend: AgendaData = {};
      
      if (formData.recordingDate) {
        dataToSend.recordingDate = new Date(formData.recordingDate).toISOString();
      }
      if (formData.deliveryDeadline) {
        dataToSend.deliveryDeadline = new Date(formData.deliveryDeadline).toISOString();
      }
      if (formData.estimatedDuration !== undefined && formData.estimatedDuration > 0) {
        dataToSend.estimatedDuration = formData.estimatedDuration;
      }
      if (formData.location) {
        dataToSend.location = formData.location;
      }
      if (formData.notes) {
        dataToSend.notes = formData.notes;
      }

      await onSave(project.id, dataToSend);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar agenda:', err);
      setError('Erro ao salvar alterações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!project) return null;

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          width: { xs: '90%', sm: '600px' },
          maxWidth: '600px',
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 'bold',
        }}
      >
        Editar Agenda - {project.title}
        <IconButton 
          onClick={onClose} 
          sx={{ color: 'white' }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
            <TextField
              label="Data da Gravação"
              type="datetime-local"
              fullWidth
              value={formData.recordingDate}
              onChange={(e) => setFormData({ ...formData, recordingDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Prazo de Entrega"
              type="datetime-local"
              fullWidth
              value={formData.deliveryDeadline}
              onChange={(e) => setFormData({ ...formData, deliveryDeadline: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
            <TextField
              label="Duração Estimada (minutos)"
              type="number"
              fullWidth
              value={formData.estimatedDuration || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                estimatedDuration: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              placeholder="Ex: 120"
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Local da Gravação"
              fullWidth
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ex: Estúdio A"
              inputProps={{ maxLength: 200 }}
              helperText={`${(formData.location || '').length}/200`}
            />
          </Box>

          <TextField
            label="Observações"
            fullWidth
            multiline
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Notas sobre a gravação, equipamentos, etc."
            inputProps={{ maxLength: 1000 }}
            helperText={`${(formData.notes || '').length}/1000`}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} sx={{ textTransform: 'none' }} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
