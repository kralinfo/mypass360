import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <section style={{ textAlign: 'center', padding: '3rem 0' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#0f172a' }}>
          MyPass360
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#64748b', marginBottom: '2rem' }}>
          Encontre e compre ingressos para os melhores eventos
        </p>
        <Link
          href="/eventos"
          style={{
            display: 'inline-block',
            background: '#0f172a',
            color: '#fff',
            padding: '0.75rem 2rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
          }}
        >
          Ver eventos
        </Link>
      </section>

      <section style={{ padding: '2rem 0' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Como funciona</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {[
            { step: '1', title: 'Escolha o evento', desc: 'Navegue pelos eventos disponíveis' },
            { step: '2', title: 'Selecione ingressos', desc: 'Escolha tipo e quantidade' },
            { step: '3', title: 'Finalize a compra', desc: 'Pague via PIX, cartão ou boleto' },
            { step: '4', title: 'Receba seu ingresso', desc: 'QR Code direto no seu email' },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                background: '#f8fafc',
                padding: '1.5rem',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  background: '#0f172a',
                  color: '#fff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                  fontWeight: 'bold',
                }}
              >
                {item.step}
              </div>
              <h3 style={{ margin: '0 0 0.5rem' }}>{item.title}</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
