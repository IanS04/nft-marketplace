import { Link } from '@tanstack/react-router'
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Unavailable } from '@/components/feedback/unavailable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { NftCategory } from '@/types'
import { cn } from '@/lib/cn'
import { Container } from './container'

const FEATURES = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

const COLLECTION_LINKS: { label: string; category: NftCategory }[] = [
  { label: 'Arte digital', category: 'arte-digital' },
  { label: 'Fotografia', category: 'fotografia' },
  { label: 'Música', category: 'musica' },
  { label: 'Arte 3D', category: 'arte-3d' },
  { label: 'Utilidade', category: 'utilidade' },
]

// Links externos de verdade: abrem em nova aba, como esperado de redes sociais.
const SOCIALS = [
  { label: 'Facebook', href: 'https://www.facebook.com/', Icon: Facebook },
  { label: 'Instagram', href: 'https://www.instagram.com/', Icon: Instagram },
  { label: 'X (Twitter)', href: 'https://x.com/', Icon: Twitter },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/', Icon: Linkedin },
  { label: 'YouTube', href: 'https://www.youtube.com/', Icon: Youtube },
]

const linkClass = 'text-body text-foreground/90 hover:text-primary'

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn('mt-16 pb-28 md:pb-6', className)}>
      <Container className="space-y-0">
        <div className="grid gap-8 rounded-t-lg bg-card px-6 py-8 md:grid-cols-2 lg:grid-cols-[repeat(3,1fr)_1.3fr] lg:gap-0 lg:px-8">
          {FEATURES.map((f) => (
            <div key={f.letter} className="space-y-3 lg:border-r lg:border-primary/60 lg:px-6 lg:first:pl-0">
              <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-primary text-title text-primary-foreground">
                {f.letter}
              </span>
              <h2 className="font-bold">{f.title}</h2>
              <p className="text-micro text-muted-foreground">{f.text}</p>
            </div>
          ))}
          <Newsletter />
        </div>

        <div className="grid gap-3 bg-band px-6 py-5 text-body sm:grid-cols-2 lg:grid-cols-4 lg:items-center lg:px-8">
          <span className="font-bold tracking-[0.2em]">KURIO</span>
          <span>Feito para colecionadores, criadores e cultura</span>
          <span>contato@email.com</span>
          <span>+55 11 4002 8922</span>
        </div>

        <div className="grid gap-8 rounded-b-lg bg-card px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <FooterColumn title="Meu perfil">
            <li><Link to="/profile" className={linkClass}>Meu perfil</Link></li>
            <li><Unavailable className={linkClass}>Minha coleção</Unavailable></li>
            <li><Unavailable className={linkClass}>Atividade</Unavailable></li>
            <li><Unavailable className={linkClass}>Estúdio do criador</Unavailable></li>
            <li><Unavailable className={linkClass}>Lista de interesse</Unavailable></li>
          </FooterColumn>
          <FooterColumn title="Central de ajuda">
            {['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'].map((label) => (
              <li key={label}><Unavailable className={linkClass}>{label}</Unavailable></li>
            ))}
          </FooterColumn>
          <FooterColumn title="Coleções">
            {COLLECTION_LINKS.map(({ label, category }) => (
              <li key={category}>
                <Link to="/" search={{ categories: [category] }} hash="catalogo" className={linkClass}>{label}</Link>
              </li>
            ))}
          </FooterColumn>
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="font-bold">Redes sociais</h2>
              <ul className="flex flex-wrap gap-2">
                {SOCIALS.map(({ label, href, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex size-7 items-center justify-center rounded-sm border border-primary text-primary hover:bg-primary/10"
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      <span className="sr-only">{label} (abre em nova aba)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <h2 className="font-bold">Carteiras compatíveis</h2>
              <p className="inline-block rounded-sm border border-primary/60 px-2 py-1 text-micro font-bold text-primary">
                METAMASK · WALLETCONNECT · COINBASE
              </p>
            </div>
          </div>
        </div>

        <p className="py-6 text-center text-micro text-muted-foreground">© 2026 Kurio. Propriedade digital para todos.</p>
      </Container>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="font-bold">{title}</h2>
      <ul className="space-y-2">{children}</ul>
    </div>
  )
}

/** Newsletter está fora do escopo: valida o e-mail e informa com clareza que não houve inscrição. */
function Newsletter() {
  const id = useId()
  const [message, setMessage] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const input = event.currentTarget.elements.namedItem('email') as HTMLInputElement
    setMessage(
      input.checkValidity()
        ? 'A inscrição na newsletter não está disponível nesta demonstração.'
        : 'Informe um e-mail válido.',
    )
  }

  return (
    <div className="space-y-3 lg:pl-6">
      <h2 id={`${id}-title`} className="text-title">Antecipe-se ao próximo lançamento</h2>
      <form onSubmit={submit} noValidate aria-labelledby={`${id}-title`} className="flex">
        <label htmlFor={`${id}-email`} className="sr-only">E-mail</label>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          placeholder="digite seu e-mail…"
          aria-describedby={`${id}-msg`}
          className="rounded-r-none border-r-0 bg-band"
        />
        <Button type="submit" className="rounded-l-none">Enviar</Button>
      </form>
      <p id={`${id}-msg`} role="status" className="text-micro text-muted-foreground">
        {message || 'Receba lançamentos selecionados, histórias de criadores e novidades do mercado.'}
      </p>
    </div>
  )
}
