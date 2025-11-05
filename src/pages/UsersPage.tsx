import { useState, useEffect } from 'react';
import { ImageUpload } from '../components/ImageUpload';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  LinearProgress,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Mail as MailIcon,
  Person as PersonIcon,
  CheckCircleOutline as CheckIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  uploadUserLogo,
  removeUserLogo,
  type User,
  type CreateUserPayload,
} from '../api/users';
import { useProtectedImage } from '../hooks/useProtectedImage';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [imagesVersion, setImagesVersion] = useState(0);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form states
  const [formData, setFormData] = useState<CreateUserPayload>({
    name: '',
    email: '',
    password: '',
    role: 'editor',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });

  const isStrongPassword = (pwd: string): boolean => {
    // Mínimo 8 chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial
    const lengthOK = pwd.length >= 8;
    const upper = /[A-Z]/.test(pwd);
    const lower = /[a-z]/.test(pwd);
    const number = /[0-9]/.test(pwd);
    const special = /[^A-Za-z0-9]/.test(pwd);
    return lengthOK && upper && lower && number && special;
  };

  const getPasswordCriteria = (pwd: string) => ({
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd),
  });

  const getStrength = (pwd: string) => {
    const criteria = getPasswordCriteria(pwd);
    const score = Object.values(criteria).filter(Boolean).length; // 0-5
    if (score <= 2) return { score, label: 'Fraca', color: '#e57373', criteria };
    if (score === 3) return { score, label: 'Média', color: '#ffb74d', criteria };
    return { score, label: 'Forte', color: '#81c784', criteria };
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await listUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar usuários');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setPasswordError(null);

    // Validação de senha forte
    if (!isStrongPassword(formData.password)) {
      setPasswordError('A senha deve ter no mínimo 8 caracteres, com letras maiúsculas e minúsculas, número e caractere especial. Ex: Senha@123');
      setSubmitting(false);
      return;
    }

    try {
      const newUser = await createUser(formData);
      
      // Upload foto se houver
      if (selectedFile) {
        await uploadUserLogo(newUser.id, selectedFile);
        // força cache-busting para novas imagens públicas
        setImagesVersion((v) => v + 1);
      }
      
      await loadUsers();
      setIsCreateModalOpen(false);
      resetForm();
      showSuccess('Usuário criado com sucesso!');
    } catch (err: unknown) {
      console.error('Erro ao criar usuário:', err);
      const message = (err as { response?: { data?: { message?: string }, status?: number } })?.response?.data?.message;
      if (message && /email/i.test(message) && /(cadastrado|existe|duplicado)/i.test(message)) {
        setError('E-mail já cadastrado. Tente outro.');
      } else {
        setError(message || 'Erro ao criar usuário');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setSubmitting(true);
    setError(null);
    try {
      await updateUser(selectedUser.id, {
        name: formData.name,
        email: formData.email,
      });
      
      // Upload da foto conforme necessário
      if (selectedFile) {
        await uploadUserLogo(selectedUser.id, selectedFile);
        // força cache-busting para novas imagens públicas
        setImagesVersion((v) => v + 1);
      }
      
      await loadUsers();
      setIsEditModalOpen(false);
      resetForm();
      showSuccess('Usuário atualizado com sucesso!');
    } catch (err: unknown) {
      console.error('Erro ao atualizar usuário:', err);
      const message = (err as { response?: { data?: { message?: string }, status?: number } })?.response?.data?.message;
      if (message && /email/i.test(message) && /(cadastrado|existe|duplicado)/i.test(message)) {
        setError('E-mail já cadastrado. Tente outro.');
      } else {
        setError(message || 'Erro ao atualizar usuário');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      console.log('[DELETE] Tentando deletar usuário:', selectedUser);
      console.log('[DELETE] ID do usuário:', selectedUser.id, 'Tipo:', typeof selectedUser.id);
      
      await deleteUser(selectedUser.id);
      
      console.log('[DELETE] Usuário deletado com sucesso');
      await loadUsers();
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      showSuccess('Usuário deletado com sucesso!');
    } catch (err: unknown) {
      console.error('[DELETE] Erro ao deletar usuário:', err);
      const error = err as { response?: { data?: { message?: string }; status?: number }; message?: string };
      console.error('[DELETE] Status do erro:', error.response?.status);
      console.error('[DELETE] Dados do erro:', error.response?.data);
      
      // Mensagem de erro mais específica
      let errorMessage = 'Erro ao deletar usuário';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 404) {
        errorMessage = 'Usuário não encontrado ou rota de exclusão indisponível';
      } else if (error.response?.status === 403) {
        errorMessage = 'Você não tem permissão para excluir este usuário';
      } else if (error.response?.status === 401) {
        errorMessage = 'Sessão expirada. Faça login novamente.';
      }
      
      setError(errorMessage);
      // Não fecha o modal para que o usuário veja o erro
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!selectedUser) return;
    
    try {
      await removeUserLogo(selectedUser.id);
      await loadUsers();
      showSuccess('Foto removida com sucesso!');
      setImagesVersion((v) => v + 1);
    } catch (err) {
      console.error('Erro ao remover foto:', err);
      setError('Erro ao remover foto');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user: User) => {
    console.log('[openDeleteModal] Abrindo modal para deletar usuário:', user);
    console.log('[openDeleteModal] ID do usuário:', user.id, 'Tipo:', typeof user.id);
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'editor',
    });
    setSelectedFile(null);
    setSelectedUser(null);
  };

  const showSuccess = (message: string) => {
    setSnack({ open: true, message, severity: 'success' });
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  function UserAvatarCell({ name, logoUrl, version }: { name: string; logoUrl?: string | null; version: number }) {
    const { src } = useProtectedImage(logoUrl, { cacheBust: version });
    if (src) return <Avatar src={src} alt={name} />;
    return <Avatar sx={{ bgcolor: 'primary.main' }}>{getInitials(name)}</Avatar>;
  }

  if (loading && users.length === 0) {
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
          <Typography variant="h4" sx={{ fontWeight: 'bold', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Usuários</Typography>
          <Typography variant="body2" color="text.secondary">Gerencie usuários e permissões</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
        >
          Novo Usuário
        </Button>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Buscar usuários..."
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

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Usuário</TableCell>
              <TableCell>E-mail</TableCell>
              <TableCell>Criado em</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <PersonIcon sx={{ mr: 1 }} /> {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <UserAvatarCell name={user.name} logoUrl={user.logoUrl} version={imagesVersion} />
                      <Typography sx={{ ml: 1.5, fontWeight: 600 }}>{user.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.primary' }}>
                      <MailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      {user.email}
                    </Box>
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEditModal(user)} title="Editar">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => openDeleteModal(user)} title="Deletar">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de Criação */}
      <Dialog open={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontWeight: 'bold' }}>Novo Usuário</DialogTitle>
        <form onSubmit={handleCreateUser}>
          <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ImageUpload label="Avatar" shape="circle" size="md" onImageSelect={(file) => setSelectedFile(file)} onImageRemove={() => setSelectedFile(null)} />
            <TextField label="Nome Completo" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required fullWidth placeholder="Ex: João Silva" />
            <TextField label="E-mail" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required fullWidth placeholder="usuario@exemplo.com" />
            <TextField 
              label="Senha" 
              type="password" 
              value={formData.password} 
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, password: val });
                if (val && !isStrongPassword(val)) {
                  setPasswordError('A senha deve ter no mínimo 8 caracteres, com letras maiúsculas e minúsculas, número e caractere especial.');
                } else {
                  setPasswordError(null);
                }
              }} 
              required 
              fullWidth 
              error={!!passwordError}
              helperText={passwordError || 'Use uma senha forte. Ex: Senha@123'}
            />
            {formData.password && (
              <Box sx={{ mt: -1 }}>
                {(() => {
                  const { score, label, color, criteria } = getStrength(formData.password);
                  const percent = (score / 5) * 100;
                  return (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LinearProgress variant="determinate" value={percent} sx={{ flex: 1, height: 8, borderRadius: 999, '& .MuiLinearProgress-bar': { backgroundColor: color } }} />
                        <Typography variant="caption" sx={{ color, fontWeight: 700 }}>{label}</Typography>
                      </Box>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: criteria.length ? 'success.main' : 'text.secondary' }}>
                          {criteria.length ? <CheckIcon fontSize="inherit" /> : <CancelIcon fontSize="inherit" />} Mínimo 8 caracteres
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: criteria.upper ? 'success.main' : 'text.secondary' }}>
                          {criteria.upper ? <CheckIcon fontSize="inherit" /> : <CancelIcon fontSize="inherit" />} 1 letra maiúscula
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: criteria.lower ? 'success.main' : 'text.secondary' }}>
                          {criteria.lower ? <CheckIcon fontSize="inherit" /> : <CancelIcon fontSize="inherit" />} 1 letra minúscula
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: criteria.number ? 'success.main' : 'text.secondary' }}>
                          {criteria.number ? <CheckIcon fontSize="inherit" /> : <CancelIcon fontSize="inherit" />} 1 número
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: criteria.special ? 'success.main' : 'text.secondary' }}>
                          {criteria.special ? <CheckIcon fontSize="inherit" /> : <CancelIcon fontSize="inherit" />} 1 caractere especial
                        </Typography>
                      </Box>
                    </>
                  );
                })()}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setIsCreateModalOpen(false); resetForm(); }} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button type="submit" disabled={submitting} variant="contained" sx={{ textTransform: 'none', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              {submitting ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Snackbar de feedback */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>

      {/* Dialog de Edição */}
      <Dialog open={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontWeight: 'bold' }}>Editar Usuário</DialogTitle>
        <form onSubmit={handleUpdateUser}>
          <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ImageUpload label="Avatar" shape="circle" size="md" currentImageUrl={selectedUser?.logoUrl || undefined} onImageSelect={(file) => setSelectedFile(file)} onImageRemove={handleRemoveAvatar} />
            <TextField label="Nome Completo" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required fullWidth />
            <TextField label="E-mail" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required fullWidth />
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
      <Dialog open={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setSelectedUser(null); setError(null); }} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography>Tem certeza que deseja deletar o usuário <b>{selectedUser?.name}</b>?</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setIsDeleteModalOpen(false); setSelectedUser(null); setError(null); }} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleDeleteUser} disabled={submitting} color="error" variant="contained" sx={{ textTransform: 'none' }}>
            {submitting ? 'Deletando...' : 'Deletar Usuário'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UsersPage;
