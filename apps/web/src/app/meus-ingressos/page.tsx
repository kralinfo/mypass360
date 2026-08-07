import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MyTicketsPage } from '@/features/tickets/components/MyTicketsPage'

export const metadata = {
  title: 'Meus Ingressos — MyPass360',
  description: 'Visualize, baixe e imprima seus ingressos adquiridos no MyPass360.',
}

export default async function MeusIngressosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/meus-ingressos')
  }

  return <MyTicketsPage />
}
