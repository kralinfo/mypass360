'use client'

import { useRouter } from 'next/navigation'

interface BackButtonProps {
  href?: string
  fallbackHref?: string
  style?: React.CSSProperties
}

export function BackButton({ href, fallbackHref, style }: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (href) {
      router.push(href)
      return
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }

    if (fallbackHref) {
      router.push(fallbackHref)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Voltar"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '2.5rem',
        height: '2.5rem',
        background: 'rgba(15, 23, 42, 0.08)',
        border: '1px solid rgba(15, 23, 42, 0.2)',
        borderRadius: '999px',
        color: '#0f172a',
        cursor: 'pointer',
        fontSize: '1.1rem',
        ...style,
      }}
    >
      ←
    </button>
  )
}
