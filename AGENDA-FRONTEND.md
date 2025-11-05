# 📅 Implementação de Agenda no Frontend

## ✅ Backend Implementado

### Novos campos no `Project`:
- `recordingDate`: Data da gravação
- `deliveryDeadline`: Prazo de entrega
- `estimatedDuration`: Duração estimada (minutos)
- `location`: Local da gravação
- `notes`: Observações

### Novos endpoints:

```
GET /projects/calendar?start=2025-11-01&end=2025-11-30
GET /projects/agenda?filter=upcoming|overdue|this-week|next-week
```

---

## 🎨 Componentes Frontend

### 1. **Formulário de Projeto com Campos de Agenda**

```tsx
// src/components/ProjectForm.tsx
import React, { useState } from 'react';

interface ProjectFormData {
  title: string;
  scriptType: 'social_media' | 'internal' | 'tv_commercial';
  clientId: string;
  recordingDate?: string;
  deliveryDeadline?: string;
  estimatedDuration?: number;
  location?: string;
  notes?: string;
}

export const ProjectForm: React.FC<{ onSubmit: (data: ProjectFormData) => void }> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    scriptType: 'social_media',
    clientId: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'estimatedDuration' ? (value ? parseInt(value) : undefined) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="project-form">
      <div className="form-group">
        <label htmlFor="title">Título do Projeto *</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          minLength={3}
          maxLength={200}
        />
      </div>

      <div className="form-group">
        <label htmlFor="scriptType">Tipo de Roteiro *</label>
        <select
          id="scriptType"
          name="scriptType"
          value={formData.scriptType}
          onChange={handleChange}
          required
        >
          <option value="social_media">Rede Social</option>
          <option value="internal">Interno</option>
          <option value="tv_commercial">VT</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="clientId">Cliente *</label>
        <select
          id="clientId"
          name="clientId"
          value={formData.clientId}
          onChange={handleChange}
          required
        >
          <option value="">Selecione um cliente</option>
          {/* Popular com lista de clientes */}
        </select>
      </div>

      <div className="form-section">
        <h3>📅 Agenda</h3>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="recordingDate">Data da Gravação</label>
            <input
              type="datetime-local"
              id="recordingDate"
              name="recordingDate"
              value={formData.recordingDate || ''}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="deliveryDeadline">Prazo de Entrega</label>
            <input
              type="datetime-local"
              id="deliveryDeadline"
              name="deliveryDeadline"
              value={formData.deliveryDeadline || ''}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="estimatedDuration">Duração Estimada (minutos)</label>
            <input
              type="number"
              id="estimatedDuration"
              name="estimatedDuration"
              value={formData.estimatedDuration || ''}
              onChange={handleChange}
              min="1"
              placeholder="Ex: 120"
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">Local da Gravação</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location || ''}
              onChange={handleChange}
              maxLength={200}
              placeholder="Ex: Estúdio A, Cliente X"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Observações</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            maxLength={1000}
            rows={3}
            placeholder="Notas sobre a gravação, equipamentos, etc."
          />
        </div>
      </div>

      <button type="submit" className="btn-primary">Criar Projeto</button>
    </form>
  );
};
```

### 2. **Visualização de Agenda em Grid**

```tsx
// src/pages/Agenda.tsx
import React, { useEffect, useState } from 'react';
import { formatDate, formatTime, getDayOfWeek } from '../utils/dateUtils';

interface Project {
  id: string;
  title: string;
  recordingDate?: string;
  deliveryDeadline?: string;
  location?: string;
  estimatedDuration?: number;
  client: { name: string };
  scriptType: string;
}

interface AgendaResponse {
  projects: Project[];
  grouped: Record<string, Project[]>;
  total: number;
}

export const AgendaPage: React.FC = () => {
  const [agendaData, setAgendaData] = useState<AgendaResponse | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'overdue' | 'this-week' | 'next-week' | 'all'>('upcoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgenda();
  }, [filter]);

  const fetchAgenda = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = filter === 'all' 
        ? '/projects/agenda' 
        : `/projects/agenda?filter=${filter}`;
      
      const response = await fetch(`http://localhost:3000${url}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setAgendaData(data);
    } catch (error) {
      console.error('Erro ao buscar agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Carregando agenda...</div>;
  if (!agendaData) return <div className="error">Erro ao carregar agenda</div>;

  return (
    <div className="agenda-page">
      <header className="agenda-header">
        <h1>📅 Agenda de Gravações</h1>
        <div className="agenda-filters">
          <button
            className={filter === 'upcoming' ? 'active' : ''}
            onClick={() => setFilter('upcoming')}
          >
            Próximas
          </button>
          <button
            className={filter === 'this-week' ? 'active' : ''}
            onClick={() => setFilter('this-week')}
          >
            Esta Semana
          </button>
          <button
            className={filter === 'next-week' ? 'active' : ''}
            onClick={() => setFilter('next-week')}
          >
            Próxima Semana
          </button>
          <button
            className={filter === 'overdue' ? 'active' : ''}
            onClick={() => setFilter('overdue')}
          >
            Atrasados
          </button>
        </div>
      </header>

      <div className="agenda-grid">
        {Object.entries(agendaData.grouped).map(([dateKey, projects]) => (
          <div key={dateKey} className="agenda-day-section">
            <div className="day-header">
              <h2>{formatDate(dateKey)}</h2>
              <span className="day-of-week">{getDayOfWeek(dateKey)}</span>
              <span className="jobs-count">{projects.length} job{projects.length > 1 ? 's' : ''}</span>
            </div>
            
            <div className="jobs-grid">
              {projects.map(project => (
                <div key={project.id} className={`job-card ${getJobClass(project)}`}>
                  <div className="job-header">
                    <h3>{project.title}</h3>
                    <span className={`badge badge-${project.scriptType}`}>
                      {project.scriptType === 'social_media' ? 'Social' : project.scriptType === 'internal' ? 'Interno' : 'VT'}
                    </span>
                  </div>
                  
                  <div className="job-info">
                    <div className="info-row">
                      <span className="icon">👤</span>
                      <span>{project.client.name}</span>
                    </div>
                    
                    {project.location && (
                      <div className="info-row">
                        <span className="icon">📍</span>
                        <span>{project.location}</span>
                      </div>
                    )}
                    
                    {project.recordingDate && (
                      <div className="info-row">
                        <span className="icon">🎬</span>
                        <span>{formatTime(project.recordingDate)}</span>
                      </div>
                    )}
                    
                    {project.estimatedDuration && (
                      <div className="info-row">
                        <span className="icon">⏱️</span>
                        <span>{project.estimatedDuration} min</span>
                      </div>
                    )}
                    
                    {project.deliveryDeadline && (
                      <div className="info-row">
                        <span className="icon">⏰</span>
                        <span>Entrega: {formatDate(project.deliveryDeadline)}</span>
                        {isOverdue(project.deliveryDeadline) && (
                          <span className="badge badge-danger">Atrasado</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="job-actions">
                    <button onClick={() => window.location.href = `/projects/${project.id}`}>
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {agendaData.total === 0 && (
        <div className="empty-state">
          <p>Nenhuma gravação agendada para este período</p>
        </div>
      )}
    </div>
  );
};

// Helpers
const getJobClass = (project: Project): string => {
  if (project.deliveryDeadline && isOverdue(project.deliveryDeadline)) {
    return 'overdue';
  }
  if (project.deliveryDeadline && isDueSoon(project.deliveryDeadline)) {
    return 'due-soon';
  }
  return '';
};

const isOverdue = (deadline: string): boolean => {
  return new Date(deadline) < new Date();
};

const isDueSoon = (deadline: string): boolean => {
  const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  return days <= 3 && days >= 0;
};
```

### 3. **Utilitários de Data**

```tsx
// src/utils/dateUtils.ts

export const formatDate = (dateString: string): string => {
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

export const formatTime = (dateString: string): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
};

export const getDayOfWeek = (dateString: string): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
  }).format(new Date(dateString));
};

export const daysUntil = (dateString: string): number => {
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
```

### 4. **CSS para Agenda Grid**

```css
/* src/styles/agenda.css */

.agenda-page {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.agenda-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.agenda-filters {
  display: flex;
  gap: 0.5rem;
}

.agenda-filters button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.agenda-filters button.active {
  background: #6366f1;
  color: white;
  border-color: #6366f1;
}

.agenda-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.agenda-day-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.day-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
}

.day-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #1f2937;
}

.day-of-week {
  color: #6b7280;
  text-transform: capitalize;
}

.jobs-count {
  margin-left: auto;
  padding: 0.25rem 0.75rem;
  background: #f3f4f6;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
}

.jobs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
}

.job-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 1rem;
  transition: all 0.2s;
}

.job-card:hover {
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.job-card.overdue {
  border-left: 4px solid #ef4444;
}

.job-card.due-soon {
  border-left: 4px solid #f59e0b;
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 0.75rem;
}

.job-header h3 {
  margin: 0;
  font-size: 1.125rem;
  color: #1f2937;
  flex: 1;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-social_media {
  background: #dbeafe;
  color: #1e40af;
}

.badge-internal {
  background: #fef3c7;
  color: #92400e;
}

.badge-tv_commercial {
  background: #f3e8ff;
  color: #6b21a8;
}

.badge-danger {
  background: #fee2e2;
  color: #991b1b;
}

.job-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #4b5563;
}

.info-row .icon {
  width: 20px;
  text-align: center;
}

.job-actions {
  display: flex;
  gap: 0.5rem;
}

.job-actions button {
  flex: 1;
  padding: 0.5rem;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.2s;
}

.job-actions button:hover {
  background: #4f46e5;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}
```

---

## 📱 Integração com Menu

```tsx
// src/components/Navigation.tsx

export const Navigation: React.FC = () => {
  return (
    <nav className="main-nav">
      <ul>
        <li>
          <Link to="/dashboard">
            <span className="icon">📊</span>
            Dashboard
          </Link>
        </li>
        <li>
          <Link to="/projects">
            <span className="icon">📁</span>
            Projetos
          </Link>
        </li>
        <li>
          <Link to="/agenda">
            <span className="icon">📅</span>
            Agenda
          </Link>
        </li>
        <li>
          <Link to="/clients">
            <span className="icon">👥</span>
            Clientes
          </Link>
        </li>
      </ul>
    </nav>
  );
};
```

---

## 🔌 Exemplos de Chamadas à API

```typescript
// src/services/projectsApi.ts

export const projectsApi = {
  // Criar projeto com agenda
  create: async (data: ProjectFormData) => {
    const response = await fetch('http://localhost:3000/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Buscar agenda com filtro
  getAgenda: async (filter?: string) => {
    const url = filter 
      ? `http://localhost:3000/projects/agenda?filter=${filter}`
      : 'http://localhost:3000/projects/agenda';
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });
    return response.json();
  },

  // Buscar calendário por período
  getCalendar: async (start: string, end: string) => {
    const response = await fetch(
      `http://localhost:3000/projects/calendar?start=${start}&end=${end}`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );
    return response.json();
  },

  // Atualizar campos de agenda
  updateSchedule: async (projectId: string, scheduleData: Partial<ProjectFormData>) => {
    const response = await fetch(`http://localhost:3000/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify(scheduleData),
    });
    return response.json();
  },
};

const getToken = () => localStorage.getItem('accessToken') || '';
```

---

---

## ✏️ Edição de Agenda

### 1. **Modal de Edição Rápida**

```tsx
// src/components/AgendaEditModal.tsx
import React, { useState } from 'react';

interface AgendaEditModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectId: string, data: Partial<Project>) => Promise<void>;
}

export const AgendaEditModal: React.FC<AgendaEditModalProps> = ({
  project,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    recordingDate: project.recordingDate || '',
    deliveryDeadline: project.deliveryDeadline || '',
    estimatedDuration: project.estimatedDuration || '',
    location: project.location || '',
    notes: project.notes || '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'estimatedDuration' ? (value ? parseInt(value) : '') : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Converter strings vazias para undefined
      const dataToSend = {
        recordingDate: formData.recordingDate || undefined,
        deliveryDeadline: formData.deliveryDeadline || undefined,
        estimatedDuration: formData.estimatedDuration || undefined,
        location: formData.location || undefined,
        notes: formData.notes || undefined,
      };
      
      await onSave(project.id, dataToSend);
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar agenda:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Editar Agenda - {project.title}</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="agenda-edit-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="recordingDate">🎬 Data da Gravação</label>
              <input
                type="datetime-local"
                id="recordingDate"
                name="recordingDate"
                value={formData.recordingDate ? new Date(formData.recordingDate).toISOString().slice(0, 16) : ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="deliveryDeadline">⏰ Prazo de Entrega</label>
              <input
                type="datetime-local"
                id="deliveryDeadline"
                name="deliveryDeadline"
                value={formData.deliveryDeadline ? new Date(formData.deliveryDeadline).toISOString().slice(0, 16) : ''}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="estimatedDuration">⏱️ Duração (minutos)</label>
              <input
                type="number"
                id="estimatedDuration"
                name="estimatedDuration"
                value={formData.estimatedDuration}
                onChange={handleChange}
                min="1"
                placeholder="Ex: 120"
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">📍 Local</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                maxLength={200}
                placeholder="Estúdio, endereço..."
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">📝 Observações</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              maxLength={1000}
              rows={3}
              placeholder="Equipamentos, preparação, contatos..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

### 2. **Integração com Página de Agenda**

```tsx
// src/pages/Agenda.tsx (atualizado)
import React, { useEffect, useState } from 'react';
import { AgendaEditModal } from '../components/AgendaEditModal';
import { formatDate, formatTime, getDayOfWeek } from '../utils/dateUtils';

export const AgendaPage: React.FC = () => {
  const [agendaData, setAgendaData] = useState<AgendaResponse | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'overdue' | 'this-week' | 'next-week' | 'all'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const fetchAgenda = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = filter === 'all' 
        ? '/projects/agenda' 
        : `/projects/agenda?filter=${filter}`;
      
      const response = await fetch(`http://localhost:3000${url}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setAgendaData(data);
    } catch (error) {
      console.error('Erro ao buscar agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAgenda = async (projectId: string, data: Partial<Project>) => {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch(`http://localhost:3000/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar projeto');
    }

    // Recarregar agenda após salvar
    await fetchAgenda();
  };

  useEffect(() => {
    fetchAgenda();
  }, [filter]);

  return (
    <div className="agenda-page">
      {/* ... header e filtros ... */}

      <div className="agenda-grid">
        {Object.entries(agendaData?.grouped || {}).map(([dateKey, projects]) => (
          <div key={dateKey} className="agenda-day-section">
            {/* ... day header ... */}
            
            <div className="jobs-grid">
              {projects.map(project => (
                <div key={project.id} className={`job-card ${getJobClass(project)}`}>
                  {/* ... conteúdo do card ... */}
                  
                  <div className="job-actions">
                    <button onClick={() => setEditingProject(project)} className="btn-edit">
                      ✏️ Editar Agenda
                    </button>
                    <button onClick={() => window.location.href = `/projects/${project.id}`} className="btn-details">
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Edição */}
      <AgendaEditModal
        project={editingProject!}
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onSave={handleSaveAgenda}
      />
    </div>
  );
};
```

### 3. **Edição Inline (Alternativa)**

```tsx
// src/components/AgendaCard.tsx
import React, { useState } from 'react';

interface AgendaCardProps {
  project: Project;
  onUpdate: (projectId: string, data: Partial<Project>) => Promise<void>;
}

export const AgendaCard: React.FC<AgendaCardProps> = ({ project, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    recordingDate: project.recordingDate || '',
    location: project.location || '',
  });

  const handleQuickSave = async () => {
    try {
      await onUpdate(project.id, editData);
      setIsEditing(false);
    } catch (error) {
      alert('Erro ao salvar');
    }
  };

  return (
    <div className="job-card">
      <div className="job-header">
        <h3>{project.title}</h3>
        <button onClick={() => setIsEditing(!isEditing)} className="btn-icon">
          {isEditing ? '❌' : '✏️'}
        </button>
      </div>

      {isEditing ? (
        <div className="inline-edit">
          <input
            type="datetime-local"
            value={editData.recordingDate ? new Date(editData.recordingDate).toISOString().slice(0, 16) : ''}
            onChange={e => setEditData(prev => ({ ...prev, recordingDate: e.target.value }))}
          />
          <input
            type="text"
            value={editData.location}
            onChange={e => setEditData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Local"
          />
          <button onClick={handleQuickSave} className="btn-save">💾 Salvar</button>
        </div>
      ) : (
        <div className="job-info">
          {project.recordingDate && (
            <div className="info-row">
              <span className="icon">🎬</span>
              <span>{formatTime(project.recordingDate)}</span>
            </div>
          )}
          {project.location && (
            <div className="info-row">
              <span className="icon">📍</span>
              <span>{project.location}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

### 4. **CSS para Modal e Edição**

```css
/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
}

.btn-close {
  background: none;
  border: none;
  font-size: 2rem;
  color: #6b7280;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
}

.btn-close:hover {
  color: #1f2937;
}

.agenda-edit-form {
  padding: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.form-group input,
.form-group textarea {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-primary {
  padding: 0.5rem 1rem;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-primary:hover:not(:disabled) {
  background: #4f46e5;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Botões do Card */
.btn-edit {
  padding: 0.5rem 1rem;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-edit:hover {
  background: #d97706;
}

.btn-details {
  padding: 0.5rem 1rem;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-details:hover {
  background: #4f46e5;
}

/* Edição Inline */
.inline-edit {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f3f4f6;
  border-radius: 4px;
}

.inline-edit input {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.btn-save {
  padding: 0.5rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-save:hover {
  background: #059669;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
}

.btn-icon:hover {
  transform: scale(1.1);
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    width: 95%;
    max-height: 95vh;
  }
}
```

### 5. **Serviço de API Atualizado**

```typescript
// src/services/projectsApi.ts

export const projectsApi = {
  // Atualizar apenas campos de agenda
  updateAgenda: async (projectId: string, agendaData: {
    recordingDate?: string;
    deliveryDeadline?: string;
    estimatedDuration?: number;
    location?: string;
    notes?: string;
  }) => {
    const response = await fetch(`http://localhost:3000/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify(agendaData),
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar agenda');
    }

    return response.json();
  },

  // Remover campos de agenda (setar como null)
  clearAgenda: async (projectId: string) => {
    return projectsApi.updateAgenda(projectId, {
      recordingDate: undefined,
      deliveryDeadline: undefined,
      estimatedDuration: undefined,
      location: undefined,
      notes: undefined,
    });
  },
};
```

### 6. **Funcionalidades Extras**

#### Arrastar e Soltar para Reagendar:
```tsx
// Usando react-dnd ou biblioteca similar
const handleDrop = async (projectId: string, newDate: string) => {
  await projectsApi.updateAgenda(projectId, {
    recordingDate: newDate,
  });
  fetchAgenda(); // Recarregar
};
```

#### Duplicar Agenda:
```tsx
const handleDuplicateAgenda = async (sourceProject: Project, targetProjectId: string) => {
  await projectsApi.updateAgenda(targetProjectId, {
    recordingDate: sourceProject.recordingDate,
    deliveryDeadline: sourceProject.deliveryDeadline,
    estimatedDuration: sourceProject.estimatedDuration,
    location: sourceProject.location,
  });
};
```

#### Reagendar em Lote:
```tsx
const handleBulkReschedule = async (projectIds: string[], daysToAdd: number) => {
  for (const id of projectIds) {
    const project = projects.find(p => p.id === id);
    if (project?.recordingDate) {
      const newDate = new Date(project.recordingDate);
      newDate.setDate(newDate.getDate() + daysToAdd);
      await projectsApi.updateAgenda(id, {
        recordingDate: newDate.toISOString(),
      });
    }
  }
  fetchAgenda();
};
```

---

## 🎯 Próximos Passos

1. ✅ Backend implementado com campos e endpoints
2. ✅ Documentação de edição de agenda
3. ⬜ Implementar componentes no front
4. ⬜ Adicionar visualização de calendário (React Big Calendar ou FullCalendar)
5. ⬜ Criar dashboards com métricas de cumprimento de prazos
6. ⬜ Adicionar notificações de prazos próximos
7. ⬜ Exportar agenda para .ics (Google Calendar, Outlook)

---

**Documentação gerada em:** 05/11/2025
