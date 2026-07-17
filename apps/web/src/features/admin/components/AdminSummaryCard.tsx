type AdminSummaryCardProps = {
  title: string
  value: string
  hint: string
}

export function AdminSummaryCard({ title, value, hint }: AdminSummaryCardProps) {
  return (
    <article
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: '1.1rem 1.2rem',
        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
        minHeight: '132px',
      }}
    >
      <p style={{ margin: 0, fontSize: '0.83rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>{title}</p>
      <strong style={{ display: 'block', marginTop: '0.7rem', fontSize: '1.85rem', color: '#020617' }}>{value}</strong>
      <p style={{ margin: '0.75rem 0 0', color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.4 }}>{hint}</p>
    </article>
  )
}
