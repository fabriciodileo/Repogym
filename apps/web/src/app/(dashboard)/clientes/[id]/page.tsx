import { ClientProfileView } from '@/components/clients/client-profile-view';

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientProfileView clientId={id} />;
}
