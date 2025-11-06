import { useState } from 'react';
import { Button, CircularProgress, Alert, Stack } from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import api from '../api/axios';

interface PdfExportButtonProps {
  projectId: string;
  versionId: string;
}

export function PdfExportButton({ projectId, versionId }: PdfExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const exportUrl = `/projects/${projectId}/versions/${versionId}/export-pdf`;

      // Inicia a exportação no backend; backend pode retornar 202 (job) ou 200 (PDF direto)
      const initRes = await api.post(exportUrl, null, { validateStatus: () => true });

      // Caso backend enfileire a geração (202), executar polling para o job
      if (initRes.status === 202) {
        const jobId = initRes.data?.jobId;
        if (!jobId) throw new Error('Exportação iniciada mas jobId não retornado');

        // Polling exponencial
        let delay = 1000;
        const maxDelay = 30000;
        while (true) {
          await new Promise((r) => setTimeout(r, delay));
          const statusRes = await api.get(`/jobs/${jobId}/status`, { validateStatus: () => true });
          if (statusRes.status === 200) {
            const st = statusRes.data;
            if (st?.status === 'completed') {
              const resultUrl = st.resultUrl || `/jobs/${jobId}/result`;
              const fileRes = await api.get(resultUrl, { responseType: 'blob' });
              const pdfBlob = new Blob([fileRes.data], { type: 'application/pdf' });
              downloadBlob(pdfBlob, `roteiro_v${versionId}.pdf`);
              break;
            }
            if (st?.status === 'failed') {
              throw new Error(st?.message || 'Geração do PDF falhou');
            }
          } else {
            console.warn('[PdfExport] check status returned', statusRes.status);
          }
          delay = Math.min(delay * 2, maxDelay);
        }
        setLoading(false);
        return;
      }

      // Se backend retornou 200 diretamente, verificar Content-Type e baixar
      if (initRes.status === 200) {
        const contentType = initRes.headers?.['content-type'] || '';
        if (contentType.includes('application/pdf')) {
          // Baixa o PDF diretamente
          const fileRes = await api.get(exportUrl, { responseType: 'blob' });
          const pdfBlob = new Blob([fileRes.data], { type: 'application/pdf' });
          downloadBlob(pdfBlob, `roteiro_v${versionId}.pdf`);
          setLoading(false);
          return;
        }
      }

      throw new Error(`Erro ao iniciar exportação: ${initRes.status}`);
    } catch (err: unknown) {
      console.error('❌ Erro ao exportar PDF:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao exportar PDF';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  function downloadBlob(blob: Blob, filename: string) {
    const blobUrl = window.URL.createObjectURL(blob);
    const newWindow = window.open(blobUrl, '_blank');
    if (newWindow) {
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } else {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
    }
  }

  return (
    <Stack spacing={1} direction="column" alignItems="flex-start">
      <Button
        onClick={handleExport}
        disabled={loading}
        startIcon={!loading ? <PictureAsPdfOutlinedIcon /> : undefined}
        sx={{
          borderRadius: '999px',
          textTransform: 'none',
          px: { xs: 2, sm: 3 },
          py: { xs: 1, sm: 1.25 },
          color: 'common.white',
          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
          boxShadow: 'none',
          '&:hover': {
            opacity: 0.95,
            boxShadow: 'none',
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
          },
          '&.Mui-disabled': {
            opacity: 0.5,
            color: 'common.white',
          },
        }}
      >
        {loading ? (
          <>
            <CircularProgress size={18} sx={{ color: 'common.white', mr: 1 }} />
            Exportando...
          </>
        ) : (
          'Exportar PDF'
        )}
      </Button>
      {error && (
        <Alert severity="error" variant="outlined" sx={{ py: 0.5 }}>
          {error}
        </Alert>
      )}
    </Stack>
  );
}