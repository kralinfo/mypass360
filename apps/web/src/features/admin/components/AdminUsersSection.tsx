import type { AdminDashboardData, AdminUserItem } from '@mypass360/types'
import { AdminPanelCard } from './AdminPanelCard'
import { formatDate } from '../admin.utils'

type AdminUsersSectionProps = {
  dashboard: AdminDashboardData | null
  isLoading: boolean
  runningAction: string | null
  onToggle: (user: AdminUserItem) => Promise<void>
  onDelete: (user: AdminUserItem) => Promise<void>
}

export function AdminUsersSection({ dashboard, isLoading, runningAction, onToggle, onDelete }: AdminUsersSectionProps) {
  return (
    <AdminPanelCard title="Gestão de usuários" subtitle="Controle administrativo de contas autenticadas e organizadores do sistema.">
      {isLoading && !dashboard ? <p style={{ color: '#64748b' }}>Carregando usuários...</p> : null}
      {dashboard?.users.length === 0 ? <p style={{ color: '#64748b' }}>Nenhum usuário encontrado.</p> : null}

      {dashboard?.users.length ? (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '980px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 0.85fr 0.85fr 1fr 1.25fr',
                gap: '0.75rem',
                padding: '0 0 0.75rem',
                borderBottom: '1px solid #e2e8f0',
                color: '#64748b',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: 700,
              }}
            >
              <div>Usuário</div>
              <div>Provedor</div>
              <div>Eventos</div>
              <div>Último acesso</div>
              <div>Ações</div>
            </div>

            {dashboard.users.map((user) => {
              const isActionLoading = runningAction?.includes(user.id)

              return (
                <div
                  key={user.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 0.85fr 0.85fr 1fr 1.25fr',
                    gap: '0.75rem',
                    padding: '0.95rem 0',
                    borderBottom: '1px solid #f1f5f9',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.95rem' }}>{user.name}</strong>
                    <span style={{ display: 'block', marginTop: '0.25rem', color: '#64748b', fontSize: '0.86rem' }}>{user.email}</span>
                  </div>
                  <div style={{ color: '#334155', fontWeight: 600 }}>{user.provider}</div>
                  <div style={{ color: '#0f172a', fontWeight: 700 }}>{user.createdEventsCount}</div>
                  <div style={{ color: '#334155', fontSize: '0.88rem' }}>{formatDate(user.lastSignInAt)}</div>
                  <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        padding: '0.38rem 0.68rem',
                        borderRadius: '999px',
                        background: user.disabled ? '#fee2e2' : '#dcfce7',
                        color: user.disabled ? '#b91c1c' : '#166534',
                        fontWeight: 700,
                        fontSize: '0.74rem',
                      }}
                    >
                      {user.disabled ? 'Desativado' : 'Ativo'}
                    </span>
                    <button
                      type="button"
                      onClick={() => void onToggle(user)}
                      disabled={isActionLoading}
                      style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '0.56rem 0.72rem',
                        background: '#fff',
                        color: '#0f172a',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: isActionLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {user.disabled ? 'Reativar' : 'Desativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(user)}
                      disabled={isActionLoading}
                      style={{
                        border: '1px solid #fecaca',
                        borderRadius: '10px',
                        padding: '0.56rem 0.72rem',
                        background: '#fff5f5',
                        color: '#b91c1c',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: isActionLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </AdminPanelCard>
  )
}
