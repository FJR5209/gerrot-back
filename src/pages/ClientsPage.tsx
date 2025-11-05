import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageUpload } from '../components/ImageUpload';
import { useProtectedImage } from '../hooks/useProtectedImage';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import {
  listClients,
  createClient,
  updateClient,
  deleteClient,
  uploadClientLogo,
  removeClientLogo,
  type Client,
} from '../api/clients';

interface CreateClientPayload {
  name: string;
  description?: string;
}

export function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [imagesVersion, setImagesVersion] = useState(0);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Form states
  const [formData, setFormData] = useState<CreateClientPayload>({
    name: '',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await listClients();
      setClients(data);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar clientes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const newClient = await createClient(formData);
      
      // Upload logo se houver
      if (selectedFile) {
        await uploadClientLogo(newClient.id, selectedFile);
        setImagesVersion((v) => v + 1);
      }
      
      await loadClients();
      setIsCreateModalOpen(false);
      resetForm();
      showSuccess('Cliente criado com sucesso!');
    } catch (err) {
      console.error('Erro ao criar cliente:', err);
      setError('Erro ao criar cliente');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    // Validação básica do ID (ObjectId 24 chars)
    const id = selectedClient.id;
    if (!id || !/^([a-f\d]{24})$/i.test(id)) {
      setError('ID do cliente inválido. Recarregue a lista e tente novamente.');
      return;
    }
    
    setSubmitting(true);
    
    try {
      await updateClient(id, formData);
      
      // Upload logo se houver novo arquivo
      if (selectedFile) {
        await uploadClientLogo(selectedClient.id, selectedFile);
        setImagesVersion((v) => v + 1);
      }
      
      await loadClients();
      setIsEditModalOpen(false);
      resetForm();
      showSuccess('Cliente atualizado com sucesso!');
    } catch (err) {
      console.error('Erro ao atualizar cliente:', err);
      setError('Erro ao atualizar cliente');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    // Validação básica do ID (ObjectId 24 chars)
    const id = selectedClient.id;
    if (!id || !/^([a-f\d]{24})$/i.test(id)) {
      setError('ID do cliente inválido. Recarregue a lista e tente novamente.');
      return;
    }
    console.log('[ClientsPage] Deletando cliente:', selectedClient);
    console.log('[ClientsPage] ID do cliente:', id);
    
    setSubmitting(true);
    
    try {
      await deleteClient(id);
      await loadClients();
      setIsDeleteModalOpen(false);
      setSelectedClient(null);
      showSuccess('Cliente deletado com sucesso!');
    } catch (err) {
      console.error('Erro ao deletar cliente:', err);
      setError('Erro ao deletar cliente');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!selectedClient) return;
    
    try {
      await removeClientLogo(selectedClient.id);
      await loadClients();
      showSuccess('Logo removida com sucesso!');
      setImagesVersion((v) => v + 1);
    } catch (err) {
      console.error('Erro ao remover logo:', err);
      setError('Erro ao remover logo');
    }
  };

  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      description: '',
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (client: Client) => {
    setSelectedClient(client);
    setIsDeleteModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
    });
    setSelectedFile(null);
    setSelectedClient(null);
  };

  const showSuccess = (message: string) => {
    // TODO: Integrar com sistema de toast
    console.log('✅', message);
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && clients.length === 0) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 3, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Clientes
          </Typography>
          <Typography variant="body2" color="text.secondary">Gerencie seus clientes e projetos</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
          }}
        >
          Novo Cliente
        </Button>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="disabled" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* Clients Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          gap: 2.5,
        }}
      >
        {filteredClients.length === 0 ? (
          <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <BusinessIcon sx={{ fontSize: 48, mb: 1 }} />
            <Typography>{searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</Typography>
          </Box>
        ) : (
          filteredClients.map((client) => (
            <Card 
              key={client.id} 
              sx={{ 
                p: 2, 
                border: '1px solid', 
                borderColor: 'grey.100', 
                transition: 'all 0.3s', 
                cursor: 'pointer',
                '&:hover': { 
                  boxShadow: 6,
                  transform: 'translateY(-4px)',
                } 
              }}
              onClick={() => navigate(`/projects?clientId=${client.id}`)}
            >
              <CardContent sx={{ pb: 1 }}>
                <ClientLogo name={client.name} logoUrl={client.logoUrl} version={imagesVersion} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{client.name}</Typography>
              </CardContent>
              <CardActions sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">
                  {client.createdAt ? new Date(client.createdAt).toLocaleDateString('pt-BR') : ''}
                </Typography>
                <Box>
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(client);
                    }} 
                    title="Editar"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteModal(client);
                    }} 
                    title="Deletar"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </CardActions>
            </Card>
          ))
        )}
      </Box>

      {/* Dialog de Criação */}
      <Dialog open={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontWeight: 'bold' }}>Novo Cliente</DialogTitle>
        <form onSubmit={handleCreateClient}>
          <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ImageUpload label="Logo do Cliente" shape="square" size="md" onImageSelect={(file) => setSelectedFile(file)} onImageRemove={() => setSelectedFile(null)} />
            <TextField label="Nome do Cliente" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required fullWidth placeholder="Ex: Empresa XYZ" />
            <TextField label="Descrição" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} fullWidth multiline minRows={3} placeholder="Informações sobre o cliente..." />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setIsCreateModalOpen(false); resetForm(); }} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button type="submit" disabled={submitting} variant="contained" sx={{ textTransform: 'none', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              {submitting ? 'Criando...' : 'Criar Cliente'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontWeight: 'bold' }}>Editar Cliente</DialogTitle>
        <form onSubmit={handleUpdateClient}>
          <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ImageUpload label="Logo do Cliente" shape="square" size="md" currentImageUrl={selectedClient?.logoUrl} onImageSelect={(file) => setSelectedFile(file)} onImageRemove={handleRemoveLogo} />
            <TextField label="Nome do Cliente" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required fullWidth />
            <TextField label="Descrição" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} fullWidth multiline minRows={3} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setIsEditModalOpen(false); resetForm(); }} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button type="submit" disabled={submitting} variant="contained" sx={{ textTransform: 'none', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              {submitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog de Confirmação de Deleção */}
      <Dialog open={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setSelectedClient(null); }} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>Tem certeza que deseja deletar o cliente <b>{selectedClient?.name}</b>?</Typography>
          <Typography variant="caption" color="text.secondary">Esta ação não pode ser desfeita e todos os projetos associados serão afetados.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setIsDeleteModalOpen(false); setSelectedClient(null); }} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleDeleteClient} disabled={submitting} color="error" variant="contained" sx={{ textTransform: 'none' }}>
            {submitting ? 'Deletando...' : 'Deletar Cliente'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function ClientLogo({ name, logoUrl, version }: { name: string; logoUrl?: string; version: number }) {
  const { src } = useProtectedImage(logoUrl, { cacheBust: version });
  if (src) {
    return (
      <Box component="img" src={src} alt={name} sx={{ width: 64, height: 64, objectFit: 'contain', mb: 1.5 }} />
    );
  }
  return (
    <Box sx={{ width: 64, height: 64, borderRadius: 1.5, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
      <BusinessIcon />
    </Box>
  );
}

export default ClientsPage;
