import { useAuthStore } from '../store/authStore';
import { PageContainer, PageHeader } from '../components/ui';
import CompanyInvitations from '../components/CompanyInvitations';

export default function Invitations() {
  const tenantId = useAuthStore(state => state.user?.tenantId);
  return <PageContainer className="pb-12">
    <PageHeader title="Convites" subtitle="Convide pessoas para o ambiente da sua empresa." />
    {tenantId ? <CompanyInvitations key={tenantId} tenantId={tenantId} /> : <p role="alert">Não foi possível identificar sua empresa. Entre novamente na plataforma.</p>}
  </PageContainer>;
}

