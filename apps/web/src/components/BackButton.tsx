'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

interface BackButtonProps {
  href?: string
  fallbackHref?: string
  style?: React.CSSProperties
  className?: string
  ariaLabel?: string
}

export function BackButton({ href, fallbackHref, style, className, ariaLabel = 'Voltar' }: BackButtonProps) {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const handleBack = useCallback(() => {
    if (isNavigating) return
    setIsNavigating(true)

    const target = href || fallbackHref || '/eventos'

    try {
      if (typeof window !== 'undefined') {
        const referrer = document.referrer
        const isInternalReferrer =
          referrer &&
          referrer.startsWith(window.location.origin) &&
          referrer !== window.location.href

        if (isInternalReferrer) {
          router.back()
          // Fallback in case router.back() is blocked or doesn't trigger unmount on mobile webview
          const timer = setTimeout(() => {
            router.push(target)
          }, 350)
          return () => clearTimeout(timer)
        }
      }
    } catch {
      // Ignore error and use push fallback
    }

    router.push(target)
  }, [href, fallbackHref, isNavigating, router])

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={ariaLabel}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '2.75rem',
        minHeight: '2.75rem',
        width: '2.75rem',
        height: '2.75rem',
        padding: 0,
        background: 'rgba(15, 23, 42, 0.08)',
        border: '1px solid rgba(15, 23, 42, 0.15)',
        borderRadius: '9999px',
        color: '#0f172a',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        transition: 'transform 0.1s ease, background-color 0.15s ease',
        zIndex: 10,
        position: 'relative',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
        ...style,
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.92)'
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = 'scale(0.92)'
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
    </button>
  )
}

