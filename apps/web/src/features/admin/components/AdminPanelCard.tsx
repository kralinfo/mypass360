import type { ReactNode } from 'react'

type AdminPanelCardProps = {
  title: string
  subtitle: string
  children: ReactNode
}

export function AdminPanelCard({ title, subtitle, children }: AdminPanelCardProps) {
  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
        overflow: 'visible',
      }}

    >
      <header
        style={{
          padding: '0.85rem 1rem 0.75rem',
          borderBottom: '1px solid #f1f5f9',
          background: '#fcfdff',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '0.97rem', color: '#0f172a' }}>{title}</h2>
        <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.83rem' }}>{subtitle}</p>
      </header>
      <div style={{ padding: '0.85rem 1rem 1rem' }}>{children}</div>
    </section>
  )
}
