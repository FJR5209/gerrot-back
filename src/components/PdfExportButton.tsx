import { useState } from 'react';
import { Button, CircularProgress, Alert, Stack } from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';

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
      // Buscar token de autenticação
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }
      
      // URL da API (ajuste conforme seu backend)
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const url = `${baseUrl}/projects/${projectId}/versions/${versionId}/export-pdf`;
      
      console.log('🎯 Exportando PDF:', url);
      console.log('🔑 Token presente:', token ? 'SIM' : 'NÃO');
      
      // Método 1: Usar fetch para ter mais controle
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na resposta:', response.status, errorText);
        throw new Error(`Erro ao exportar PDF: ${response.status}`);
      }
      
      console.log('✅ PDF recebido, Content-Type:', response.headers.get('content-type'));
      
      // Converter resposta para blob com tipo correto
      const blob = await response.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      console.log('📦 Blob criado:', pdfBlob.size, 'bytes, tipo:', pdfBlob.type);
      
      // Criar URL do blob
      const blobUrl = window.URL.createObjectURL(pdfBlob);
      
      // Tentar abrir em nova aba para visualização
      const newWindow = window.open(blobUrl, '_blank');
      
      if (newWindow) {
        console.log('✅ PDF aberto em nova aba para visualização');
        // Revogar após 60s ou quando a janela fechar
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 60000);
      } else {
        console.log('⚠️ Popup bloqueado, fazendo download direto');
        // Fallback: download direto usando <a> programático
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `roteiro_v${versionId}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // Revogar só após o download iniciar
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        }, 100);
      }
      
      console.log('✅ PDF exportado com sucesso!');
      
    } catch (err: unknown) {
      console.error('❌ Erro ao exportar PDF:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao exportar PDF';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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