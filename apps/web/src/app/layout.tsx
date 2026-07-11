import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
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
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <CartProvider>
          <Navbar />
          <div style={{ flex: 1, paddingTop: '76px' }}>{children}</div>
        </CartProvider>
        <Footer />
      </body>
    </html>
  )
}
