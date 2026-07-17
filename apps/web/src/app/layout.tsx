import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppShell } from '@/components/AppShell'
import { CartProvider } from '@/features/cart/cart-context'

export const metadata: Metadata = {
  title: {
    default: 'MyPass360',
    template: '%s | MyPass360',
  },
  description: 'Compre e gerencie seus ingressos para eventos',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MyPass360',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: '100vh' }}>
        <CartProvider>
          <AppShell>{children}</AppShell>
        </CartProvider>
      </body>
    </html>
  )
}
