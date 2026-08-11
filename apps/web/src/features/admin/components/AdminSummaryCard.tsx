type AdminSummaryCardProps = {
  title: string
  value: string
  hint: string
  isClickable?: boolean
  isActive?: boolean
  onClick?: () => void
  accentColor?: string
}

export function AdminSummaryCard({
  title,
  value,
  hint,
  isClickable = false,
  isActive = false,
  onClick,
  accentColor = '#6366f1',
}: AdminSummaryCardProps) {
  return (
    <article
      onClick={isClickable ? onClick : undefined}
      style={{
        background: isActive ? `${accentColor}08` : '#fff',
        border: isActive ? `1.5px solid ${accentColor}` : '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '0.85rem 1rem',
        boxShadow: isActive
          ? `0 8px 20px ${accentColor}22`
          : '0 4px 16px rgba(15, 23, 42, 0.05)',
        minHeight: '100px',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p
          style={{
            margin: 0,
            fontSize: '0.83rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: isActive ? accentColor : '#64748b',
            fontWeight: isActive ? 700 : 600,
            transition: 'color 0.2s',
          }}
        >
          {title}
        </p>
        {isClickable && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: isActive ? accentColor : '#f1f5f9',
              color: isActive ? '#fff' : '#94a3b8',
              fontSize: '0.7rem',
              transition: 'all 0.2s ease',
              transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
              flexShrink: 0,
            }}
          >
            ▼
          </span>
        )}
      </div>

      <strong
        style={{
          display: 'block',
          marginTop: '0.45rem',
          fontSize: '1.5rem',
          color: isActive ? accentColor : '#020617',
          transition: 'color 0.2s',
        }}
      >
        {value}
      </strong>
      <p style={{ margin: '0.4rem 0 0', color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.35 }}>
        {hint}
      </p>

      {isActive && (
        <div
          style={{
            position: 'absolute',
            bottom: '-1px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderBottom: `10px solid ${accentColor}`,
          }}
        />
      )}
    </article>
  )
}
