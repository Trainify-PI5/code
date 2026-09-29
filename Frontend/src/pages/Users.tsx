import React, { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, Edit2, Trash2, Check, X, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { Badge, Button, Card, ConfirmDialog, DataTable, Input, PageHeader, useToast, type Coluna } from '../components/ui';

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
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<User | null>(null);

  const toast = useToast();

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
      toast.success(isEditMode ? 'Usuário atualizado.' : 'Usuário criado.');
    } catch (err) {
      console.error('Erro ao salvar usuário', err);
      toast.error('Não foi possível salvar o usuário. Confira os dados e tente novamente.');
    }
  };

  const confirmarExclusao = async () => {
    if (!usuarioParaExcluir) return;
    try {
      await api.delete(`/users/${usuarioParaExcluir.id}`);
      fetchUsers();
      toast.success('Usuário excluído.');
    } catch (err) {
      console.error('Erro ao excluir usuário', err);
      toast.error('Não foi possível excluir o usuário.');
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
      default: return <Shield className="w-4 h-4 text-on-surface-variant" />;
    }
  };

  const colunas: Coluna<any>[] = [
    {
      key: "name",
      header: "Usuário",
      sortValue: (user) => user.name,
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-full bg-primary-container text-white flex items-center justify-center font-bold overflow-hidden border border-outline-variant">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-on-surface truncate">{user.name}</p>
            <p className="text-sm text-on-surface-variant truncate">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Função",
      sortValue: (user) => user.role,
      render: (user) => (
        <div className="flex items-center gap-2">
          {getRoleIcon(user.role)}
          <span className="text-sm font-medium text-on-surface-variant">{user.role}</span>
        </div>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      // ordena por situacao, nao pelo texto: ativo primeiro
      sortValue: (user) => (user.isActive ? 0 : 1),
      render: (user) => (
        <Badge tone={user.isActive ? "success" : "neutral"}>
          {user.isActive ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "acoes",
      header: "Ações",
      align: "right",
      hideLabelOnMobile: true,
      render: (user) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleToggleStatus(user)}
            className="p-2 text-on-surface-variant hover:text-green-600 dark:hover:text-green-400 transition-colors rounded-lg hover:bg-surface-container"
            title={user.isActive ? "Desativar usuário" : "Ativar usuário"}
            aria-label={user.isActive ? `Desativar ${user.name}` : `Ativar ${user.name}`}
          >
            {user.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={() => openEditModal(user)}
            className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-lg hover:bg-surface-container"
            title="Editar"
            aria-label={`Editar ${user.name}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setUsuarioParaExcluir(user)}
            className="p-2 text-on-surface-variant hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-surface-container"
            title="Excluir"
            aria-label={`Excluir ${user.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Gestão de Usuários"
        subtitle="Administre os acessos e permissões da plataforma."
        actions={
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </Button>
        }
      />

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

        <DataTable
          columns={colunas}
          rows={filteredUsers}
          rowKey={(user) => user.id}
          loading={loading}
          pageSize={20}
          skeletonAvatar
          initialSort={{ key: "name", direcao: "asc" }}
          emptyMessage="Nenhum usuário encontrado."
        />
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

      <ConfirmDialog
        open={usuarioParaExcluir !== null}
        onClose={() => setUsuarioParaExcluir(null)}
        onConfirm={confirmarExclusao}
        tone="danger"
        title="Excluir usuário"
        message={
          <>
            <strong className="text-on-surface">{usuarioParaExcluir?.name}</strong>{" "}
            perderá o acesso à plataforma. Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir"
      />
    </div>
  );
};

export default Users;
