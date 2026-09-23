import React, { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, Edit2, Trash2, Check, X, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { Badge, Button, Card, Input } from '../components/ui';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  avatar?: string;
  department?: string;
}

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [isActive, setIsActive] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Erro ao buscar usuários', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedUserId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('STUDENT');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setIsEditMode(true);
    setSelectedUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword(''); // leave blank on edit
    setRole(user.role);
    setIsActive(user.isActive);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && selectedUserId) {
        await api.put(`/users/${selectedUserId}`, { name, email, role, isActive });
      } else {
        await api.post('/users', { name, email, password, role });
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Erro ao salvar usuário', err);
      alert('Erro ao salvar usuário. Verifique os dados e tente novamente.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await api.delete(`/users/${id}`);
        fetchUsers();
      } catch (err) {
        console.error('Erro ao excluir usuário', err);
        alert('Erro ao excluir usuário.');
      }
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await api.put(`/users/${user.id}`, {
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: !user.isActive
      });
      fetchUsers();
    } catch (err) {
      console.error('Erro ao atualizar status', err);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'ADMIN': return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'MANAGER': return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      default: return <Shield className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-on-surface">Gestão de Usuários</h1>
          <p className="text-on-surface-variant mt-2">Administre os acessos e permissões da plataforma.</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </Button>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low">
          <div className="max-w-md">
            <Input
              type="text"
              placeholder="Buscar por nome ou email..."
              aria-label="Buscar usuários"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant text-sm font-medium">
                <th className="p-4">Usuário</th>
                <th className="p-4">Função</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Carregando usuários...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold overflow-hidden border border-outline-variant">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-on-surface">{user.name}</p>
                          <p className="text-sm text-on-surface-variant">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span className="text-sm font-medium text-on-surface-variant">
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge tone={user.isActive ? "success" : "neutral"}>
                        {user.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className="p-2 text-on-surface-variant hover:text-green-600 dark:hover:text-green-400 transition-colors rounded-lg hover:bg-surface-container"
                          title={user.isActive ? "Desativar usuário" : "Ativar usuário"}
                        >
                          {user.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-lg hover:bg-surface-container"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-on-surface-variant hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-surface-container"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card
            padding="none"
            className="w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="p-6 border-b border-outline-variant">
              <h2 className="text-xl font-display font-bold text-on-surface">
                {isEditMode ? "Editar Usuário" : "Criar Novo Usuário"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input
                label="Nome Completo"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              {!isEditMode && (
                <Input
                  label="Senha Inicial"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}

              <div className="space-y-2">
                <label
                  htmlFor="user-role"
                  className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest"
                >
                  Função (Role)
                </label>
                <select
                  id="user-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface outline-none transition-all focus:border-primary"
                >
                  <option value="STUDENT">Aluno (Student)</option>
                  <option value="INSTRUCTOR">Instrutor (Instructor)</option>
                  <option value="MANAGER">Gestor (Manager)</option>
                  <option value="ADMIN">Administrador (Admin)</option>
                </select>
              </div>

              {isEditMode && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-on-surface-variant">
                    Usuário Ativo
                  </label>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {isEditMode ? "Salvar Alterações" : "Criar Usuário"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Users;
