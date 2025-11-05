import { useState } from 'react';
import { useAIStreaming } from '../hooks/useAIStreaming';
import { useAuth } from '../contexts/AuthContextObject';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  TextField,
  Button,
  Paper,
  Alert,
  Stack,
  InputLabel,
  FormControl,
} from '@mui/material';

interface AISidebarProps {
  projectId: string;
  currentScript?: string;
  onSaveGenerated: (text: string) => void;
}

type ScriptType = 'vt' | 'social_media' | 'internal' | 'tv_commercial';

export function AiSidebar({ projectId, currentScript, onSaveGenerated }: AISidebarProps) {
  const [prompt, setPrompt] = useState('');
  const [scriptType, setScriptType] = useState<ScriptType>('vt');
  const [duracao, setDuracao] = useState(30);
  const [publicoAlvo, setPublicoAlvo] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const { token } = useAuth();
  
  const { status, partial, error, sendPrompt } = useAIStreaming({ 
    projectId,
    token: token ?? undefined,
  });

  const handleGenerate = () => {
    const context = {
      scriptType,
      duracao,
      publicoAlvo,
      objetivo,
    };

    const task = {
      currentScriptContent: currentScript,
      userPrompt: prompt
    };

    sendPrompt(context, task);
  };

  return (
    <Box sx={{ p: 2.5, borderLeft: 1, borderColor: 'divider', width: 320, bgcolor: 'background.paper' }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Geração de Roteiro</Typography>
      <Stack spacing={2}>
        <FormControl fullWidth>
          <InputLabel id="script-type-label">Tipo de Script</InputLabel>
          <Select
            labelId="script-type-label"
            label="Tipo de Script"
            value={scriptType}
            onChange={(e) => setScriptType(e.target.value as ScriptType)}
            size="small"
          >
            <MenuItem value="vt">VT</MenuItem>
            <MenuItem value="social_media">Social Media</MenuItem>
            <MenuItem value="internal">Interno</MenuItem>
            <MenuItem value="tv_commercial">Comercial de TV</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Duração (segundos)"
          type="number"
          value={duracao}
          onChange={(e) => setDuracao(Number(e.target.value))}
          size="small"
          fullWidth
        />

        <TextField
          label="Público Alvo"
          value={publicoAlvo}
          onChange={(e) => setPublicoAlvo(e.target.value)}
          size="small"
          fullWidth
          placeholder="Ex: Jovens 18-25"
        />

        <TextField
          label="Objetivo"
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value)}
          size="small"
          fullWidth
          placeholder="Ex: Conversão"
        />

        <TextField
          label="Prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          multiline
          minRows={4}
          fullWidth
          placeholder="Descreva o que você quer gerar..."
        />

        {error && (
          <Alert severity="error">{error}</Alert>
        )}

        <Stack direction="row" spacing={1}>
          <Button
            onClick={handleGenerate}
            disabled={status === 'running'}
            variant="contained"
            fullWidth
            sx={{
              textTransform: 'none',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': { opacity: 0.95 },
            }}
          >
            {status === 'running' ? 'Gerando...' : 'Gerar'}
          </Button>

          {partial && (
            <Button
              onClick={() => onSaveGenerated(partial)}
              color="success"
              variant="contained"
              sx={{ textTransform: 'none', borderRadius: 999 }}
            >
              Salvar
            </Button>
          )}
        </Stack>

        {partial && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Preview</Typography>
            <Paper variant="outlined" sx={{ p: 2, maxHeight: 380, overflowY: 'auto' }}>
              <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', fontSize: 14, color: 'text.primary' }}>
                {partial}
              </Box>
            </Paper>
          </Box>
        )}
      </Stack>
    </Box>
  );
}