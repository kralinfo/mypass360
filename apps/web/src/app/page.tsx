import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      <h1>MyPass360</h1>
      <p>Encontre e compre ingressos para os melhores eventos</p>
      <Link href="/eventos">Ver eventos</Link>
    </main>
  )
}
