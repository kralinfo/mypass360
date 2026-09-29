import { createClient } from '@/lib/supabase/client'

export interface BankAccountData {
  id?: string
  user_id?: string
  event_id?: string
  person_type: 'pf' | 'pj'
  holder_name: string
  document: string
  bank_code: string
  bank_name: string
  account_type: 'corrente' | 'poupanca'
  agency: string
  account_number: string
  account_digit: string
  created_at?: string
  updated_at?: string
}

export const BANK_NAME_MAP: Record<string, string> = {
  '001': 'Banco do Brasil S.A.',
  '237': 'Banco Bradesco S.A.',
  '341': 'Itaú Unibanco S.A.',
  '033': 'Banco Santander Brasil',
  '260': 'Nu Pagamentos S.A. (Nubank)',
  '077': 'Banco Inter S.A.',
  '104': 'Caixa Econômica Federal',
  '999': 'Outro Banco',
}

const LOCAL_STORAGE_KEY = 'mypass360_bank_account'

/**
 * Busca os dados bancários salvos do organizador logado
 */
export async function getOrganizerBankAccount(): Promise<BankAccountData | null> {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user?.id) {
      // Fallback para localStorage
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (cached) return JSON.parse(cached)
      }
      return null
    }

    const { data, error } = await supabase
      .from('organizer_bank_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.warn('Erro ao carregar conta bancária no Supabase:', error.message)
    }

    if (data) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
      }
      return data as BankAccountData
    }

    // Se não encontrou no Supabase, tenta recuperar do cache local
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (cached) return JSON.parse(cached)
    }

    return null
  } catch (err) {
    console.error('Falha ao obter conta bancária:', err)
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (cached) return JSON.parse(cached)
    }
    return null
  }
}

/**
 * Salva ou atualiza a conta bancária do organizador no Supabase e no Cache Local
 */
export async function saveOrganizerBankAccount(
  data: Omit<BankAccountData, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
  eventId?: string
): Promise<BankAccountData> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const bankName = BANK_NAME_MAP[data.bank_code] || data.bank_name || 'Outro Banco'
  const payload = {
    ...data,
    bank_name: bankName,
    event_id: eventId || null,
    updated_at: new Date().toISOString(),
  }

  // Cache Local Imediato
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload))
  }

  if (session?.user?.id) {
    const { data: saved, error } = await supabase
      .from('organizer_bank_accounts')
      .upsert(
        {
          user_id: session.user.id,
          ...payload,
        },
        { onConflict: 'user_id' }
      )
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao persistir no Supabase:', error.message)
      // Se falhar o RLS/tabela no DB por falta de execução da migration, ainda retorna os dados com cache
      return { ...payload, user_id: session.user.id } as BankAccountData
    }

    return saved as BankAccountData
  }

  return payload as BankAccountData
}

/**
 * Busca todas as contas bancárias dos organizadores (Uso do Módulo Admin)
 */
export async function getAllOrganizerBankAccounts(): Promise<Record<string, BankAccountData>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('organizer_bank_accounts')
      .select('*')

    if (error) {
      console.warn('Não foi possível carregar contas no admin:', error.message)
      return {}
    }

    const map: Record<string, BankAccountData> = {}
    if (data) {
      data.forEach((acc) => {
        if (acc.user_id) map[acc.user_id] = acc as BankAccountData
        if (acc.event_id) map[acc.event_id] = acc as BankAccountData
      })
    }
    return map
  } catch (err) {
    console.error('Erro ao listar contas bancárias para o admin:', err)
    return {}
  }
}
