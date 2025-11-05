import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Schedule as ScheduleIcon,
  Place as PlaceIcon,
  Timer as TimerIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { getAgenda, type AgendaResponse, type Project } from '../api/projects';
import { listClients, type Client } from '../api/clients';
import { AgendaEditModal } from '../components/AgendaEditModal';
import api from '../api/axios';

type FilterType = 'upcoming' | 'overdue' | 'this-week' | 'next-week';

export default function AgendaPage() {
  const navigate = useNavigate();
  const [agendaData, setAgendaData] = useState<AgendaResponse | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [agenda, clientsList] = await Promise.all([
        getAgenda(filter),
        listClients(),
      ]);
      setAgendaData(agenda);
      setClients(clientsList);
    } catch (err) {
      console.error('Erro ao carregar agenda:', err);
      setError('Erro ao carregar agenda. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const getClientName = (clientId?: string): string => {
    if (!clientId) return 'Cliente não especificado';
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Cliente não encontrado';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Amanhã';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const formatTime = (dateString: string): string => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const getDayOfWeek = (dateString: string): string => {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
    }).format(new Date(dateString));
  };

  const isOverdue = (deadline?: string): boolean => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const isDueSoon = (deadline?: string): boolean => {
    if (!deadline) return false;
    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days <= 3 && days >= 0;
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      social_media: 'Social',
      internal: 'Interno',
      tv_commercial: 'VT',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string): 'primary' | 'secondary' | 'success' => {
    const colors: Record<string, 'primary' | 'secondary' | 'success'> = {
      tv_commercial: 'primary',
      social_media: 'secondary',
      internal: 'success',
    };
    return colors[type] || 'primary';
  };

  const handleEditAgenda = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevenir navegação do card
    setEditingProject(project);
    setIsEditModalOpen(true);
  };

  const handleSaveAgenda = async (projectId: string, agendaData: {
    recordingDate?: string;
    deliveryDeadline?: string;
    estimatedDuration?: number;
    location?: string;
    notes?: string;
  }) => {
    const token = localStorage.getItem('token');
    const response = await api.patch(
      `/projects/${projectId}`,
      agendaData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data) {
      throw new Error('Erro ao atualizar agenda');
    }

    // Recarregar agenda após salvar
    await loadData();
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingProject(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 0.5,
            }}
          >
            📅 Agenda de Gravações
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie suas gravações e prazos de entrega
          </Typography>
        </Box>
      </Box>

      {/* Filtros */}
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, val) => val !== null && setFilter(val)}
          size="small"
        >
          <ToggleButton value="upcoming">
            <ScheduleIcon sx={{ mr: 1, fontSize: '1rem' }} />
            Próximas
          </ToggleButton>
          <ToggleButton value="this-week">
            <CalendarIcon sx={{ mr: 1, fontSize: '1rem' }} />
            Esta Semana
          </ToggleButton>
          <ToggleButton value="next-week">
            <CalendarIcon sx={{ mr: 1, fontSize: '1rem' }} />
            Próxima Semana
          </ToggleButton>
          <ToggleButton value="overdue">
            <WarningIcon sx={{ mr: 1, fontSize: '1rem' }} />
            Atrasados
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Agenda Grid */}
      {agendaData && agendaData.total === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CalendarIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Nenhuma gravação agendada para este período
          </Typography>
        </Box>
      ) : (
        <Stack spacing={4}>
          {agendaData && Object.entries(agendaData.grouped).map(([dateKey, projects]) => (
            <Box key={dateKey}>
              {/* Day Header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  mb: 2,
                  pb: 1,
                  borderBottom: '2px solid',
                  borderColor: 'primary.main',
                }}
              >
                <Typography variant="h5" fontWeight={700}>
                  {formatDate(dateKey)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {getDayOfWeek(dateKey)}
                </Typography>
                <Chip 
                  label={`${projects.length} job${projects.length > 1 ? 's' : ''}`}
                  size="small"
                  sx={{ ml: 'auto' }}
                />
              </Box>

              {/* Projects Grid */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(2, 1fr)',
                    lg: 'repeat(3, 1fr)',
                  },
                  gap: 2,
                }}
              >
                {projects.map((project: Project) => {
                  const hasOverdueDeadline = isOverdue(project.deliveryDeadline);
                  const isDueSoonDeadline = isDueSoon(project.deliveryDeadline);

                  return (
                    <Card
                      key={project.id}
                      sx={{
                        position: 'relative',
                        borderLeft: hasOverdueDeadline ? '4px solid' : isDueSoonDeadline ? '4px solid' : 'none',
                        borderColor: hasOverdueDeadline ? 'error.main' : isDueSoonDeadline ? 'warning.main' : 'transparent',
                        transition: 'all 0.3s',
                        '&:hover': {
                          boxShadow: 4,
                          transform: 'translateY(-2px)',
                        },
                        '&:hover .edit-button': {
                          opacity: 1,
                        },
                      }}
                    >
                      {/* Botão de editar - aparece no hover */}
                      <IconButton
                        className="edit-button"
                        onClick={(e) => handleEditAgenda(project, e)}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 10,
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          backgroundColor: 'background.paper',
                          '&:hover': {
                            backgroundColor: 'primary.main',
                            color: 'white',
                          },
                        }}
                        size="small"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>

                      <CardActionArea onClick={() => navigate(`/projects/${project.id}`)}>
                        <CardContent>
                          {/* Header */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                            <Typography variant="h6" fontWeight={700} sx={{ flex: 1, mr: 1 }}>
                              {project.title}
                            </Typography>
                            <Chip
                              label={getTypeLabel(project.scriptType)}
                              size="small"
                              color={getTypeColor(project.scriptType)}
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>

                          {/* Client */}
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            👤 {getClientName(project.clientId)}
                          </Typography>

                          <Divider sx={{ my: 1.5 }} />

                          {/* Info */}
                          <Stack spacing={1}>
                            {project.recordingDate && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ScheduleIcon fontSize="small" color="action" />
                                <Typography variant="caption" color="text.secondary">
                                  Gravação: {formatTime(project.recordingDate)}
                                </Typography>
                              </Box>
                            )}

                            {project.location && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PlaceIcon fontSize="small" color="action" />
                                <Typography variant="caption" color="text.secondary">
                                  {project.location}
                                </Typography>
                              </Box>
                            )}

                            {project.estimatedDuration && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TimerIcon fontSize="small" color="action" />
                                <Typography variant="caption" color="text.secondary">
                                  {project.estimatedDuration} minutos
                                </Typography>
                              </Box>
                            )}

                            {project.deliveryDeadline && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {hasOverdueDeadline ? (
                                  <WarningIcon fontSize="small" color="error" />
                                ) : (
                                  <CheckCircleIcon fontSize="small" color="success" />
                                )}
                                <Typography
                                  variant="caption"
                                  color={hasOverdueDeadline ? 'error.main' : 'text.secondary'}
                                  fontWeight={hasOverdueDeadline ? 600 : 400}
                                >
                                  Entrega: {formatDate(project.deliveryDeadline)} às {formatTime(project.deliveryDeadline)}
                                </Typography>
                                {hasOverdueDeadline && (
                                  <Chip label="ATRASADO" size="small" color="error" sx={{ ml: 'auto', fontSize: '0.65rem' }} />
                                )}
                              </Box>
                            )}
                          </Stack>

                          {/* Notes */}
                          {project.notes && (
                            <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                💬 {project.notes}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Stack>
      )}

      {/* Modal de Edição de Agenda */}
      <AgendaEditModal
        project={editingProject}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveAgenda}
      />
    </Box>
  );
}
