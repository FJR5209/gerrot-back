import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContextObject';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Paper,
  IconButton,
  Checkbox,
} from '@mui/material';
import {
  Add as AddIcon,
  Movie as MovieIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { 
  listProjects, 
  createProject as createProjectAPI, 
  updateProject,
  getProject,
  deleteProject, 
  type Project, 
  type ScriptType,
} from '../api/projects';
import { listClients, type Client } from '../api/clients';

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<ScriptType | 'all'>('all');
  const [filterOwnership, setFilterOwnership] = useState<'all' | 'mine' | 'edited'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'client' | 'modified'>('date');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({ 
    title: '', 
    clientId: '', 
    scriptType: '' as ScriptType | '',
    recordingDate: '',
    deliveryDeadline: '',
    estimatedDuration: undefined as number | undefined,
    location: '',
    notes: '',
  });
  const [editProject, setEditProject] = useState({ title: '', scriptType: '' as ScriptType | '' });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  useEffect(() => {
    loadData();
    // Verificar se há um clientId na URL
    const clientIdFromUrl = searchParams.get('clientId');
    if (clientIdFromUrl) {
      setSelectedClientId(clientIdFromUrl);
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      const [projectsData, clientsData] = await Promise.all([
        listProjects(),
        listClients(),
      ]);
      setProjects(projectsData);
      setClients(clientsData);
      setLoading(false);
    } catch {
      setError('Erro ao carregar dados');
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.clientId || !newProject.scriptType) {
      setError('Selecione um cliente e um tipo');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await createProjectAPI({
        title: newProject.title,
        scriptType: newProject.scriptType as ScriptType,
        clientId: newProject.clientId,
        recordingDate: newProject.recordingDate || undefined,
        deliveryDeadline: newProject.deliveryDeadline || undefined,
        estimatedDuration: newProject.estimatedDuration,
        location: newProject.location || undefined,
        notes: newProject.notes || undefined,
      });
      setProjects([created, ...projects]);
      setIsModalOpen(false);
      setNewProject({ 
        title: '', 
        clientId: '', 
        scriptType: '',
        recordingDate: '',
        deliveryDeadline: '',
        estimatedDuration: undefined,
        location: '',
        notes: '',
      });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Erro ao criar projeto');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    // Validação básica do ID (ObjectId 24 chars)
    const id = selectedProject.id;
    if (!id || !/^([a-f\d]{24})$/i.test(id)) {
      setError('ID do projeto inválido. Recarregue a lista e tente novamente.');
      return;
    }

    if (!editProject.title || !editProject.scriptType) {
      setError('Título e tipo são obrigatórios');
      return;
    }
    
    setUpdating(true);
    setError(null);
    try {
      // Pré-checagem: garantir que o projeto existe no backend
      try {
        await getProject(id);
      } catch (preErr: unknown) {
        const status = (preErr as { response?: { status?: number; data?: unknown } })?.response?.status;
        if (status === 404) {
          setError('Projeto não encontrado no servidor. Recarregue a página.');
          setUpdating(false);
          return;
        }
      }

      const updated = await updateProject(id, {
        title: editProject.title,
        scriptType: editProject.scriptType as ScriptType,
      });
      setProjects(projects.map((p) => (p.id === id ? updated : p)));
      setIsEditModalOpen(false);
      setSelectedProject(null);
      setEditProject({ title: '', scriptType: '' });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Erro ao atualizar projeto');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    // Validação básica do ID (ObjectId 24 chars)
    const id = selectedProject.id;
    if (!id || !/^([a-f\d]{24})$/i.test(id)) {
      setError('ID do projeto inválido. Recarregue a lista e tente novamente.');
      return;
    }
    
    setDeleting(true);
    setError(null);
    try {
      // Pré-checagem: garantir que o projeto existe no backend
      try {
        await getProject(id);
      } catch (preErr: unknown) {
        const status = (preErr as { response?: { status?: number; data?: unknown } })?.response?.status;
        if (status === 404) {
          setError('Projeto já removido ou não encontrado. Atualize a lista.');
          setDeleting(false);
          return;
        }
      }

      await deleteProject(id);
      setProjects(projects.filter((p) => p.id !== id));
      setIsDeleteModalOpen(false);
      setSelectedProject(null);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Erro ao deletar projeto');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleProject = (projectId: string) => {
    setSelectedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedProjects.size === filteredProjects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(filteredProjects.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    setError(null);
    
    try {
      const deletePromises = Array.from(selectedProjects).map(id => deleteProject(id));
      await Promise.all(deletePromises);
      
      setProjects(projects.filter(p => !selectedProjects.has(p.id)));
      setSelectedProjects(new Set());
      setIsBulkDeleteModalOpen(false);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Erro ao deletar projetos selecionados');
    } finally {
      setBulkDeleting(false);
    }
  };

  const openEditModal = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevenir navegação do card
    setSelectedProject(project);
    setEditProject({
      title: project.title,
      scriptType: project.scriptType,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevenir navegação do card
    setSelectedProject(project);
    setIsDeleteModalOpen(true);
  };

  const getTypeLabel = (type: ScriptType) => {
    switch (type) {
      case 'tv_commercial':
        return 'VT';
      case 'social_media':
        return 'Social';
      case 'internal':
        return 'Interno';
      default:
        return type;
    }
  };

  const getTypeColor = (type: ScriptType) => {
    switch (type) {
      case 'tv_commercial':
        return 'primary';
      case 'social_media':
        return 'secondary';
      case 'internal':
        return 'success';
      default:
        return 'default';
    }
  };

  // Filtros e ordenação
  const filteredProjects = projects
    .filter((p) => {
      // Se há um cliente selecionado, mostrar apenas projetos daquele cliente
      if (selectedClientId) {
        return p.clientId === selectedClientId;
      }
      
      const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clients.find(c => c.id === p.clientId)?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'all' || p.scriptType === filterType;
      
      // Filtro de propriedade
      let matchOwnership = true;
      if (filterOwnership === 'mine' && user) {
        matchOwnership = p.createdBy === user.id;
      } else if (filterOwnership === 'edited' && user) {
        matchOwnership = p.lastModifiedBy === user.id && p.createdBy !== user.id;
      }
      
      return matchSearch && matchType && matchOwnership;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'modified') {
        const aDate = a.updatedAt || a.createdAt;
        const bDate = b.updatedAt || b.createdAt;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'client') {
        const aClient = clients.find(c => c.id === a.clientId)?.name || '';
        const bClient = clients.find(c => c.id === b.clientId)?.name || '';
        return aClient.localeCompare(bClient);
      }
      return 0;
    });

  // Encontrar clientes que correspondem à busca
  const matchedClients = searchTerm && !selectedClientId
    ? clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  // Agrupar por cliente
  const groupedByClient = filteredProjects.reduce((acc, p) => {
    const clientId = p.clientId || 'unknown';
    if (!acc[clientId]) acc[clientId] = [];
    acc[clientId].push(p);
    return acc;
  }, {} as Record<string, Project[]>);

  // Estatísticas
  const stats = {
    total: projects.length,
    tv: projects.filter(p => p.scriptType === 'tv_commercial').length,
    social: projects.filter(p => p.scriptType === 'social_media').length,
    internal: projects.filter(p => p.scriptType === 'internal').length,
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error && projects.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 3, md: 4 } }}>
      {/* Cabeçalho */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Meus Projetos
          </Typography>
          <Stack direction="row" spacing={2}>
            {selectionMode ? (
              <>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedProjects(new Set());
                  }}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 8,
                  }}
                >
                  Cancelar Seleção
                </Button>
                {selectedProjects.size > 0 && (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 8,
                    }}
                  >
                    Excluir ({selectedProjects.size})
                  </Button>
                )}
              </>
            ) : (
              <>
                <IconButton
                  onClick={() => setSelectionMode(true)}
                  sx={{
                    color: 'error.main',
                    '&:hover': {
                      backgroundColor: 'error.lighter',
                    },
                  }}
                  title="Modo de seleção em bloco"
                >
                  <DeleteIcon />
                </IconButton>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setIsModalOpen(true)}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 8,
                    boxShadow: 2,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: 3,
                    },
                  }}
                >
                  Novo Projeto
                </Button>
              </>
            )}
          </Stack>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Gerencie seus roteiros e projetos
        </Typography>
      </Box>

      {/* Botão para mostrar estatísticas */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <IconButton
          onClick={() => setShowStats((v) => !v)}
          sx={{ opacity: 0.3, transition: 'opacity 0.2s', ':hover': { opacity: 0.8 }, mr: 1 }}
          title="Mostrar estatísticas"
        >
          <BarChartIcon fontSize="large" />
        </IconButton>
      </Box>
      {showStats && (
        <Paper sx={{ p: 2, mb: 3, background: 'rgba(102, 126, 234, 0.05)' }}>
          <Stack direction="row" spacing={3} flexWrap="wrap" justifyContent="flex-end">
            <Box>
              <Typography variant="caption" color="text.secondary">Total</Typography>
              <Typography variant="h6" fontWeight={700}>{stats.total}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="caption" color="text.secondary">VT</Typography>
              <Typography variant="h6" fontWeight={700} color="primary.main">{stats.tv}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Social</Typography>
              <Typography variant="h6" fontWeight={700} color="secondary.main">{stats.social}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Interno</Typography>
              <Typography variant="h6" fontWeight={700} color="success.main">{stats.internal}</Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Busca e Filtros ocultos até interação */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            placeholder="Buscar por título ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            onFocus={() => setShowFilters(true)}
            onClick={() => setShowFilters(true)}
          />
          {showFilters && (
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <FilterIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">Tipo:</Typography>
                <ToggleButtonGroup
                  value={filterType}
                  exclusive
                  onChange={(_, val) => val !== null && setFilterType(val)}
                  size="small"
                >
                  <ToggleButton value="all">Todos</ToggleButton>
                  <ToggleButton value="tv_commercial">VT</ToggleButton>
                  <ToggleButton value="social_media">Social</ToggleButton>
                  <ToggleButton value="internal">Interno</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <Divider orientation="vertical" flexItem />
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary">Propriedade:</Typography>
                <ToggleButtonGroup
                  value={filterOwnership}
                  exclusive
                  onChange={(_, val) => val !== null && setFilterOwnership(val)}
                  size="small"
                >
                  <ToggleButton value="all">Todos</ToggleButton>
                  <ToggleButton value="mine">Meus Projetos</ToggleButton>
                  <ToggleButton value="edited">Editados por Mim</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <Divider orientation="vertical" flexItem />
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary">Ordenar:</Typography>
                <ToggleButtonGroup
                  value={sortBy}
                  exclusive
                  onChange={(_, val) => val !== null && setSortBy(val)}
                  size="small"
                >
                  <ToggleButton value="date">Data Criação</ToggleButton>
                  <ToggleButton value="modified">Última Modificação</ToggleButton>
                  <ToggleButton value="title">Título</ToggleButton>
                  <ToggleButton value="client">Cliente</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </Stack>
          )}
        </Stack>
        
        {/* Checkbox de seleção em bloco - aparece apenas no modo de seleção */}
        {selectionMode && filteredProjects.length > 0 && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Checkbox
              checked={selectedProjects.size === filteredProjects.length && filteredProjects.length > 0}
              indeterminate={selectedProjects.size > 0 && selectedProjects.size < filteredProjects.length}
              onChange={handleSelectAll}
            />
            <Typography variant="body2" color="text.secondary">
              {selectedProjects.size > 0 
                ? `${selectedProjects.size} projeto(s) selecionado(s)` 
                : 'Selecionar todos'}
            </Typography>
            {selectedProjects.size > 0 && (
              <Button
                size="small"
                onClick={() => setSelectedProjects(new Set())}
                sx={{ ml: 'auto' }}
              >
                Limpar seleção
              </Button>
            )}
          </Stack>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Cards de clientes encontrados */}
      {matchedClients.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Clientes encontrados
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: 2,
            }}
          >
            {matchedClients.map((client) => {
              const clientProjectCount = projects.filter(p => p.clientId === client.id).length;
              return (
                <Card
                  key={client.id}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-4px)',
                    },
                  }}
                  onClick={() => {
                    setSelectedClientId(client.id);
                    setSearchTerm('');
                  }}
                >
                  <CardActionArea>
                    <CardContent>
                      <Typography variant="h6" fontWeight={700} mb={1}>
                        {client.name}
                      </Typography>
                      <Chip 
                        label={`${clientProjectCount} ${clientProjectCount === 1 ? 'projeto' : 'projetos'}`} 
                        size="small" 
                        color="primary"
                      />
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Indicador de filtro por cliente ativo */}
      {selectedClientId && (
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={`Filtrando por: ${clients.find(c => c.id === selectedClientId)?.name || 'Cliente'}`}
            onDelete={() => setSelectedClientId(null)}
            color="primary"
          />
        </Box>
      )}

      {filteredProjects.length === 0 && projects.length === 0 ? (
        /* Estado vazio */
        <Box
          sx={{
            textAlign: 'center',
            py: 10,
            px: 3,
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 80,
              height: 80,
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
              mb: 3,
            }}
          >
            <MovieIcon sx={{ fontSize: 40, color: '#667eea' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Nenhum projeto criado
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
            Comece criando seu primeiro projeto de roteiro.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsModalOpen(true)}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 8,
              px: 4,
              py: 1.5,
            }}
          >
            Criar Primeiro Projeto
          </Button>
        </Box>
      ) : filteredProjects.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body1" color="text.secondary">
            Nenhum projeto encontrado com os filtros aplicados.
          </Typography>
        </Box>
      ) : (
        /* Projetos agrupados por cliente */
        <Stack spacing={4}>
          {Object.entries(groupedByClient).map(([clientId, clientProjects]) => {
            const client = clients.find(c => c.id === clientId);
            const clientName = client?.name || 'Cliente não encontrado';
            
            return (
              <Box key={clientId}>
                <Typography variant="h6" fontWeight={700} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {clientName}
                  <Chip label={clientProjects.length} size="small" />
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, 1fr)',
                      lg: 'repeat(3, 1fr)',
                    },
                    gap: 3,
                  }}
                >
                  {clientProjects.map((project) => {
            const typeLabel = getTypeLabel(project.scriptType);
            const typeColor = getTypeColor(project.scriptType);

            return (
              <Box key={project.id}>
                <Card
                  sx={{
                    height: '100%',
                    position: 'relative',
                    transition: 'all 0.3s',
                    border: selectionMode && selectedProjects.has(project.id) ? 2 : 1,
                    borderColor: selectionMode && selectedProjects.has(project.id) ? 'primary.main' : 'divider',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-4px)',
                    },
                    '&:hover .action-buttons': {
                      opacity: 1,
                    },
                  }}
                >
                  {/* Checkbox de seleção - aparece apenas no modo de seleção */}
                  {selectionMode && (
                    <Checkbox
                      checked={selectedProjects.has(project.id)}
                      onChange={() => handleToggleProject(project.id)}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        zIndex: 10,
                      }}
                    />
                  )}

                  {/* Botões de ação - aparecem no hover */}
                  <Stack
                    direction="row"
                    spacing={0.5}
                    className="action-buttons"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      zIndex: 10,
                      opacity: 0,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <Button
                      size="small"
                      color="primary"
                      variant="contained"
                      onClick={(e) => openEditModal(project, e)}
                      sx={{
                        minWidth: 'auto',
                        p: 0.5,
                        borderRadius: 1,
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="contained"
                      onClick={(e) => openDeleteModal(project, e)}
                      sx={{
                        minWidth: 'auto',
                        p: 0.5,
                        borderRadius: 1,
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </Button>
                  </Stack>

                  <CardActionArea
                    onClick={() => navigate(`/projects/${project.id}`)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent sx={{ pt: selectionMode ? 6 : 2 }}>
                      <Typography variant="h6" fontWeight={700} mb={0.5}>
                        {project.title}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <Chip label={typeLabel} size="small" color={typeColor} sx={{ fontWeight: 600 }} />
                        {project.createdBy === user?.id && (
                          <Chip label="Meu Projeto" size="small" variant="outlined" color="primary" sx={{ fontSize: '0.65rem' }} />
                        )}
                        {project.lastModifiedBy && project.lastModifiedBy !== project.createdBy && (
                          <Chip label="Editado" size="small" variant="outlined" color="secondary" sx={{ fontSize: '0.65rem' }} />
                        )}
                      </Stack>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Criado por {project.createdByName || 'Usuário não identificado'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {formatDate(project.createdAt)}
                        </Typography>
                      </Box>
                      {project.lastModifiedBy && project.lastModifiedBy !== project.createdBy && (
                        <Box sx={{ pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Última edição por {project.lastModifiedByName || 'Usuário não identificado'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {formatDate(project.updatedAt || project.createdAt)}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
            );
                  })}
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* Modal de criação */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          Novo Projeto
        </DialogTitle>
        <form onSubmit={handleCreateProject}>
          <DialogContent sx={{ mt: 2 }}>
            <TextField
              autoFocus
              label="Título"
              fullWidth
              value={newProject.title}
              onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
              required
              placeholder="Nome do projeto"
              sx={{ mb: 3 }}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
              <TextField
                select
                label="Cliente"
                fullWidth
                value={newProject.clientId}
                onChange={(e) => setNewProject({ ...newProject, clientId: e.target.value })}
                required
              >
                <MenuItem value="" disabled>
                  Selecione um cliente
                </MenuItem>
                {clients.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Tipo"
                fullWidth
                value={newProject.scriptType}
                onChange={(e) => setNewProject({ ...newProject, scriptType: e.target.value as ScriptType })}
                required
              >
                <MenuItem value="" disabled>
                  Selecione o tipo
                </MenuItem>
                <MenuItem value="tv_commercial">VT</MenuItem>
                <MenuItem value="social_media">Social</MenuItem>
                <MenuItem value="internal">Interno</MenuItem>
              </TextField>
            </Box>

            {/* Seção de Agenda */}
            <Divider sx={{ my: 2 }}>
              <Chip label="📅 Agenda" size="small" />
            </Divider>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField
                label="Data da Gravação"
                type="datetime-local"
                fullWidth
                value={newProject.recordingDate}
                onChange={(e) => setNewProject({ ...newProject, recordingDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Prazo de Entrega"
                type="datetime-local"
                fullWidth
                value={newProject.deliveryDeadline}
                onChange={(e) => setNewProject({ ...newProject, deliveryDeadline: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField
                label="Duração Estimada (minutos)"
                type="number"
                fullWidth
                value={newProject.estimatedDuration || ''}
                onChange={(e) => setNewProject({ ...newProject, estimatedDuration: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Ex: 120"
                inputProps={{ min: 1 }}
              />
              <TextField
                label="Local da Gravação"
                fullWidth
                value={newProject.location}
                onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                placeholder="Ex: Estúdio A"
              />
            </Box>

            <TextField
              label="Observações"
              fullWidth
              multiline
              rows={3}
              value={newProject.notes}
              onChange={(e) => setNewProject({ ...newProject, notes: e.target.value })}
              placeholder="Notas sobre a gravação, equipamentos, etc."
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setIsModalOpen(false)} sx={{ textTransform: 'none' }}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={creating}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {creating ? <CircularProgress size={20} color="inherit" /> : 'Criar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog de confirmação de deleção */}
      <Dialog open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja deletar o projeto <b>{selectedProject?.title}</b>?
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteModalOpen(false)} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteProject}
            disabled={deleting}
            color="error"
            variant="contained"
            sx={{ textTransform: 'none' }}
          >
            {deleting ? <CircularProgress size={20} color="inherit" /> : 'Deletar Projeto'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de edição de projeto */}
      <Dialog open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleUpdateProject}>
          <DialogTitle>Editar Projeto</DialogTitle>
          <DialogContent>
            <TextField
              label="Título do Projeto"
              value={editProject.title}
              onChange={(e) => setEditProject({ ...editProject, title: e.target.value })}
              fullWidth
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Tipo de Roteiro</InputLabel>
              <Select
                value={editProject.scriptType}
                onChange={(e: SelectChangeEvent) => setEditProject({ ...editProject, scriptType: e.target.value as ScriptType })}
                label="Tipo de Roteiro"
              >
                <MenuItem value="social_media">Mídia Social</MenuItem>
                <MenuItem value="internal">Interno</MenuItem>
                <MenuItem value="tv_commercial">Comercial de TV</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsEditModalOpen(false)} sx={{ textTransform: 'none' }}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={updating}
              sx={{
                textTransform: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontWeight: 600,
              }}
            >
              {updating ? <CircularProgress size={20} color="inherit" /> : 'Salvar Alterações'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog de confirmação de exclusão em bloco */}
      <Dialog open={isBulkDeleteModalOpen} onClose={() => setIsBulkDeleteModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Exclusão em Bloco</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja deletar <b>{selectedProjects.size} projeto(s)</b>?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsBulkDeleteModalOpen(false)} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            color="error"
            variant="contained"
            sx={{ textTransform: 'none' }}
          >
            {bulkDeleting ? <CircularProgress size={20} color="inherit" /> : `Deletar ${selectedProjects.size} Projeto(s)`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
