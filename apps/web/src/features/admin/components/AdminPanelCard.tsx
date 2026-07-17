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
        borderRadius: '20px',
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: '1.15rem 1.25rem 1rem',
          borderBottom: '1px solid #f1f5f9',
          background: '#fcfdff',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.08rem', color: '#0f172a' }}>{title}</h2>
        <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.92rem' }}>{subtitle}</p>
      </header>
      <div style={{ padding: '1rem 1.1rem 1.15rem' }}>{children}</div>
    </section>
  )
}
