import { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Launch as LaunchIcon } from '@mui/icons-material';
import { listProjects, createProject, type Project, type ScriptType } from '../api/projects';
import { listClients, createClient, type Client } from '../api/clients';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export function DashboardPage() {
  // KPIs e gráfico
  // KPIs e gráfico
  // (deve ficar após definição dos estados)

  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [clientId, setClientId] = useState('');
  const [scriptType, setScriptType] = useState<ScriptType | ''>('');
  const [newClientName, setNewClientName] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [projetos, setProjetos] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingClient, setCreatingClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // KPIs e gráficos
  const totalProjetos = projetos.length;
  const totalClientes = clients.length;
  const projetosPorTipo = {
    tv_commercial: projetos.filter((p) => p.scriptType === 'tv_commercial').length,
    social_media: projetos.filter((p) => p.scriptType === 'social_media').length,
    internal: projetos.filter((p) => p.scriptType === 'internal').length,
  };

  // Dados dos gráficos doughnut
  const createDoughnutData = (value: number, color: string) => ({
    labels: ['Quantidade', 'Restante'],
    datasets: [
      {
        data: [value, Math.max(totalProjetos - value, 0)],
        backgroundColor: [color, 'rgba(255,255,255,0.1)'],
        borderColor: ['transparent', 'transparent'],
        borderWidth: 0,
      },
    ],
  });

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '75%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  useEffect(() => {
    (async () => {
      try {
        const [data, clientList] = await Promise.all([
          listProjects(),
          listClients(),
        ]);
        setProjetos(data);
        setClients(clientList);
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
        setError('Erro ao carregar roteiros');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptType) return;
    try {
      const newProject = await createProject({ title: titulo, clientId, scriptType });
      setProjetos([newProject, ...projetos]);
      setIsCreateOpen(false);
      setTitulo('');
      setClientId('');
      setScriptType('');
      navigate(`/projects/${newProject.id}`);
    } catch (err) {
      console.error('Erro ao criar projeto:', err);
      setError('Erro ao criar roteiro');
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingClient(true);
    try {
      const newClient = await createClient({ name: newClientName });
      setClients([...clients, newClient]);
      setClientId(newClient.id);
      setNewClientName('');
      setIsClientModalOpen(false);
    } catch (err) {
      console.error('Erro ao criar cliente:', err);
      setError('Erro ao criar cliente');
    } finally {
      setCreatingClient(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 3, md: 4 } }}>
      {/* KPIs e Gráfico */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mb: 4, flexWrap: 'wrap' }}>
        {/* Card Total de Projetos */}
        <Paper elevation={3} sx={{ p: 3, minWidth: 200, flex: 1, bgcolor: 'background.paper', position: 'relative' }}>
          <Box sx={{ width: 120, height: 120, margin: '0 auto', position: 'relative' }}>
            <Doughnut 
              data={createDoughnutData(totalProjetos, 'rgba(102,126,234,0.8)')} 
              options={doughnutOptions}
            />
            <Box sx={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {totalProjetos}
              </Typography>
            </Box>
          </Box>
          <Typography variant="subtitle1" sx={{ textAlign: 'center', mt: 2, fontWeight: 600 }}>
            Total de Projetos
          </Typography>
        </Paper>

        {/* Card Total de Clientes */}
        <Paper elevation={3} sx={{ p: 3, minWidth: 200, flex: 1, bgcolor: 'background.paper', position: 'relative' }}>
          <Box sx={{ width: 120, height: 120, margin: '0 auto', position: 'relative' }}>
            <Doughnut 
              data={createDoughnutData(totalClientes, 'rgba(118,75,162,0.8)')} 
              options={doughnutOptions}
            />
            <Box sx={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {totalClientes}
              </Typography>
            </Box>
          </Box>
          <Typography variant="subtitle1" sx={{ textAlign: 'center', mt: 2, fontWeight: 600 }}>
            Total de Clientes
          </Typography>
        </Paper>

        {/* Card VT */}
        <Paper elevation={3} sx={{ p: 3, minWidth: 200, flex: 1, bgcolor: 'background.paper', position: 'relative' }}>
          <Box sx={{ width: 120, height: 120, margin: '0 auto', position: 'relative' }}>
            <Doughnut 
              data={createDoughnutData(projetosPorTipo.tv_commercial, 'rgba(102,126,234,0.8)')} 
              options={doughnutOptions}
            />
            <Box sx={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {projetosPorTipo.tv_commercial}
              </Typography>
            </Box>
          </Box>
          <Typography variant="subtitle1" sx={{ textAlign: 'center', mt: 2, fontWeight: 600 }}>
            VT
          </Typography>
        </Paper>

        {/* Card Social */}
        <Paper elevation={3} sx={{ p: 3, minWidth: 200, flex: 1, bgcolor: 'background.paper', position: 'relative' }}>
          <Box sx={{ width: 120, height: 120, margin: '0 auto', position: 'relative' }}>
            <Doughnut 
              data={createDoughnutData(projetosPorTipo.social_media, 'rgba(118,75,162,0.8)')} 
              options={doughnutOptions}
            />
            <Box sx={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {projetosPorTipo.social_media}
              </Typography>
            </Box>
          </Box>
          <Typography variant="subtitle1" sx={{ textAlign: 'center', mt: 2, fontWeight: 600 }}>
            Social Media
          </Typography>
        </Paper>

        {/* Card Interno */}
        <Paper elevation={3} sx={{ p: 3, minWidth: 200, flex: 1, bgcolor: 'background.paper', position: 'relative' }}>
          <Box sx={{ width: 120, height: 120, margin: '0 auto', position: 'relative' }}>
            <Doughnut 
              data={createDoughnutData(projetosPorTipo.internal, 'rgba(76,175,80,0.8)')} 
              options={doughnutOptions}
            />
            <Box sx={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {projetosPorTipo.internal}
              </Typography>
            </Box>
          </Box>
          <Typography variant="subtitle1" sx={{ textAlign: 'center', mt: 2, fontWeight: 600 }}>
            Interno
          </Typography>
        </Paper>
      </Box>
      {/* Cabeçalho */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Meus Roteiros
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsCreateOpen(true)}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: 2,
            '&:hover': {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: 3,
            },
          }}
        >
          Novo Roteiro
        </Button>
      </Box>

      {/* Loading / Error */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        /* Tabela */
        <TableContainer component={Paper} sx={{ boxShadow: 2, bgcolor: 'background.paper' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'background.paper' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary', bgcolor: 'background.paper' }}>TÍTULO</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary', bgcolor: 'background.paper' }}>CLIENTE</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary', bgcolor: 'background.paper' }}>TIPO</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary', bgcolor: 'background.paper' }}>CRIADO POR</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary', bgcolor: 'background.paper' }}>ÚLTIMA ATUALIZAÇÃO</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary', bgcolor: 'background.paper' }}>AÇÕES</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projetos.map((p) => {
                const clientName = clients.find((c) => c.id === p.clientId)?.name ?? '-';
                const typeLabel =
                  p.scriptType === 'tv_commercial'
                    ? 'VT'
                    : p.scriptType === 'social_media'
                    ? 'Social'
                    : p.scriptType === 'internal'
                    ? 'Interno'
                    : '-';
                return (
                  <TableRow
                    key={p.id}
                    sx={{
                      '&:hover': { bgcolor: 'grey.50' },
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    <TableCell sx={{ color: 'text.primary', bgcolor: 'background.paper' }}>{p.title}</TableCell>
                    <TableCell sx={{ color: 'text.primary', bgcolor: 'background.paper' }}>{clientName}</TableCell>
                    <TableCell sx={{ color: 'text.primary', bgcolor: 'background.paper' }}>{typeLabel}</TableCell>
                    <TableCell sx={{ color: 'text.primary', bgcolor: 'background.paper' }}>
                      <Box>
                        <Typography variant="body2">{p.createdByName || 'Usuário não identificado'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: 'text.primary', bgcolor: 'background.paper' }}>
                      <Box>
                        <Typography variant="body2">
                          {p.lastModifiedByName || p.createdByName || 'Usuário não identificado'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(p.updatedAt || p.createdAt).toLocaleDateString('pt-BR')}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: 'text.primary', bgcolor: 'background.paper' }}>
                      <IconButton
                        size="small"
                        sx={{ color: '#667eea' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${p.id}`);
                        }}
                      >
                        <LaunchIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal de criação de roteiro */}
      <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          Novo Roteiro
        </DialogTitle>
        <form onSubmit={handleCreate}>
          <DialogContent sx={{ mt: 2 }}>
            <TextField
              autoFocus
              label="Título"
              fullWidth
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              placeholder="Ex: Campanha de Natal"
              sx={{ mb: 3 }}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Cliente
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setIsClientModalOpen(true)}
                    sx={{
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      color: '#667eea',
                      fontWeight: 600,
                    }}
                  >
                    + Novo
                  </Button>
                </Box>
                <TextField
                  select
                  fullWidth
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                  size="small"
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
              </Box>
              <TextField
                select
                label="Tipo"
                fullWidth
                value={scriptType}
                onChange={(e) => setScriptType(e.target.value as ScriptType)}
                required
                size="small"
              >
                <MenuItem value="" disabled>
                  Selecione o tipo
                </MenuItem>
                <MenuItem value="tv_commercial">VT</MenuItem>
                <MenuItem value="social_media">Social</MenuItem>
                <MenuItem value="internal">Interno</MenuItem>
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setIsCreateOpen(false)} sx={{ textTransform: 'none' }}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Criar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal de criação de cliente */}
      <Dialog open={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          Novo Cliente
        </DialogTitle>
        <form onSubmit={handleCreateClient}>
          <DialogContent sx={{ mt: 2 }}>
            <TextField
              autoFocus
              label="Nome do Cliente"
              fullWidth
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              required
              placeholder="Ex: Cliente Acme"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setIsClientModalOpen(false)} sx={{ textTransform: 'none' }}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={creatingClient}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {creatingClient ? <CircularProgress size={20} color="inherit" /> : 'Criar Cliente'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
