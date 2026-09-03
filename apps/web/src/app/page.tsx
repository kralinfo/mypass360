import EventsPage from './eventos/page'

/**
 * A rota principal (/) agora aponta diretamente para a tela de eventos do MyPass360.
 */
export default EventsPage

/**
 * ── CÓDIGO DA TELA PRINCIPAL ANTERIOR (PRESERVADO INTEGRAMENTE PARA REGISTRO/CONSULTA) ──
 * 
 * import Link from 'next/link'
 * 
 * export function LegacyHomePage() {
 *   return (
 *     <>
 *       <style>{`
 *         .hero-section {
 *           text-align: center;
 *           padding: 3rem 0;
 *         }
 *         .steps-container {
 *           display: grid;
 *           grid-template-columns: repeat(4, 1fr);
 *           gap: 1.5rem;
 *         }
 *         .step-card {
 *           background: #fff;
 *           border: 1px solid #e2e8f0;
 *           padding: 1.5rem;
 *           borderRadius: 12px;
 *           text-align: center;
 *           box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
 *           transition: transform 0.2s ease;
 *         }
 *         .step-card:hover {
 *           transform: translateY(-2px);
 *         }
 *         @media (max-width: 768px) {
 *           .hero-section {
 *             padding: 1.25rem 0;
 *           }
 *           .hero-section h1 {
 *             font-size: 1.85rem !important;
 *             margin-bottom: 0.5rem !important;
 *           }
 *           .hero-section p {
 *             font-size: 0.95rem !important;
 *             margin-bottom: 1.25rem !important;
 *           }
 *           .steps-container {
 *             display: grid;
 *             grid-template-columns: 1fr 1fr;
 *             gap: 0.65rem;
 *             padding: 0;
 *           }
 *           .step-card {
 *             padding: 1rem 0.75rem;
 *             border-radius: 10px;
 *           }
 *           .step-card h3 {
 *             font-size: 0.85rem !important;
 *           }
 *           .step-card p {
 *             font-size: 0.75rem !important;
 *           }
 *         }
 *       `}</style>
 *       <main style={{ padding: '2rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>
 *         <section className="hero-section">
 *           <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 800, letterSpacing: '-0.02em' }}>
 *             MyPass360
 *           </h1>
 *           <p style={{ fontSize: '1.2rem', color: '#64748b', marginBottom: '2rem', maxWidth: '32rem', margin: '0 auto 2rem', lineHeight: 1.5 }}>
 *             Encontre e compre ingressos para os melhores eventos
 *           </p>
 *           <Link
 *             href="/eventos"
 *             style={{
 *               display: 'inline-block',
 *               background: '#0f172a',
 *               color: '#fff',
 *               padding: '0.75rem 2rem',
 *               borderRadius: '8px',
 *               textDecoration: 'none',
 *               fontWeight: '600',
 *               boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.15)',
 *             }}
 *           >
 *             Ver eventos
 *           </Link>
 *         </section>
 * 
 *         <section style={{ padding: '2rem 0' }}>
 *           <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.25rem', color: '#0f172a' }}>Como funciona</h2>
 *           <div className="steps-container">
 *             {[
 *               { step: '1', title: 'Escolha o evento', desc: 'Navegue pelos eventos disponíveis' },
 *               { step: '2', title: 'Selecione ingressos', desc: 'Escolha tipo e quantidade' },
 *               { step: '3', title: 'Finalize a compra', desc: 'Pague via PIX, cartão ou boleto' },
 *               { step: '4', title: 'Receba seu ingresso', desc: 'QR Code direto no seu email' },
 *             ].map((item) => (
 *               <div key={item.step} className="step-card">
 *                 <div
 *                   style={{
 *                     width: '36px',
 *                     height: '36px',
 *                     background: '#0f172a',
 *                     color: '#fff',
 *                     borderRadius: '50%',
 *                     display: 'flex',
 *                     alignItems: 'center',
 *                     justifyContent: 'center',
 *                     margin: '0 auto 0.75rem',
 *                     fontWeight: 'bold',
 *                     fontSize: '0.95rem',
 *                   }}
 *                 >
 *                   {item.step}
 *                 </div>
 *                 <h3 style={{ margin: '0 0 0.4rem', fontSize: '0.98rem', color: '#0f172a', fontWeight: 700 }}>{item.title}</h3>
 *                 <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem', lineHeight: 1.4 }}>{item.desc}</p>
 *               </div>
 *             ))}
 *           </div>
 *         </section>
 *       </main>
 *     </>
 *   )
 * }
 */
