import { Link } from '@tanstack/react-router'
import { ChevronDown, Info } from 'lucide-react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Container } from '@/components/layout/container'
import { BUY_STEPS, FAQ, GLOSSARY, LEARN_SECTIONS } from '../content'

const TOC = [
  ...LEARN_SECTIONS.map(({ id, title }) => ({ id, title })),
  { id: 'como-comprar', title: 'Como comprar no Kurio' },
  { id: 'glossario', title: 'Glossário' },
  { id: 'perguntas', title: 'Perguntas frequentes' },
]

// scroll-mt: o header fixo (64px) não cobre o título ao seguir um link com #âncora.
const sectionClass = 'scroll-mt-24 space-y-3'

/** "Aprenda": como NFTs funcionam, explicado com o que existe neste mercado. */
export function LearnPage() {
  return (
    <Container className="space-y-6 py-6 md:py-10">
      <Breadcrumb className="hidden md:block" items={[{ label: 'Início', link: { to: '/' } }, { label: 'Aprenda' }]} />
      <header className="max-w-2xl space-y-2">
        <h1 className="text-heading">Aprenda sobre NFTs</h1>
        <p className="text-muted-foreground">
          O essencial para colecionar com segurança: o que é um NFT, como redes, edições e royalties funcionam e como comprar aqui no Kurio.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <nav aria-labelledby="toc-title" className="self-start rounded-lg bg-card p-4 lg:sticky lg:top-24">
          <h2 id="toc-title" className="pb-2 text-body font-bold">Nesta página</h2>
          <ol className="space-y-1.5 text-body">
            {TOC.map((item) => (
              <li key={item.id}>
                <Link to="/learn" hash={item.id} className="text-primary hover:underline">{item.title}</Link>
              </li>
            ))}
          </ol>
        </nav>

        <article className="min-w-0 max-w-3xl space-y-10">
          {LEARN_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className={sectionClass}>
              <h2 id={`${section.id}-title`} className="text-title">{section.title}</h2>
              {section.paragraphs.map((p) => <p key={p} className="text-body">{p}</p>)}
              {section.bullets && (
                <ul className="space-y-2 rounded-lg bg-card p-4">
                  {section.bullets.map((b) => (
                    <li key={b.term} className="text-body"><strong className="text-primary">{b.term}:</strong> {b.text}</li>
                  ))}
                </ul>
              )}
              {section.id === 'royalties' && (
                <p className="text-body">
                  <Link to="/creators" className="text-primary underline underline-offset-4">Conheça os criadores</Link> e veja quanto cada um cobra.
                </p>
              )}
            </section>
          ))}

          <section id="como-comprar" aria-labelledby="como-comprar-title" className={sectionClass}>
            <h2 id="como-comprar-title" className="text-title">Como comprar no Kurio</h2>
            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BUY_STEPS.map((step, i) => (
                <li key={step.title} className="space-y-1.5 rounded-lg bg-card p-4">
                  <p className="font-bold">
                    <span aria-hidden="true" className="mr-2 text-primary">{String(i + 1).padStart(2, '0')}</span>
                    <span className="sr-only">Passo {i + 1}: </span>{step.title}
                  </p>
                  <p className="text-micro text-muted-foreground">{step.text}</p>
                  {step.link && (
                    <Link to={step.link.to} hash={step.link.hash} className="inline-block text-micro text-primary underline underline-offset-4">
                      {step.link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section id="glossario" aria-labelledby="glossario-title" className={sectionClass}>
            <h2 id="glossario-title" className="text-title">Glossário</h2>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {GLOSSARY.map((g) => (
                <div key={g.term} className="rounded-lg bg-card p-4">
                  <dt className="font-bold text-primary">{g.term}</dt>
                  <dd className="text-micro text-muted-foreground">{g.text}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="perguntas" aria-labelledby="perguntas-title" className={sectionClass}>
            <h2 id="perguntas-title" className="text-title">Perguntas frequentes</h2>
            <div className="space-y-2">
              {FAQ.map((item) => (
                <details key={item.question} className="group rounded-lg bg-card p-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">
                    {item.question}
                    <ChevronDown className="size-4 shrink-0 text-primary transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="pt-2 text-body text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <p className="flex items-start gap-2 rounded-lg border border-primary/40 p-4 text-micro text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            Conteúdo educativo, não é recomendação de investimento. Neste mercado de demonstração, carteiras, pagamentos e blockchain são simulados.
          </p>
        </article>
      </div>
    </Container>
  )
}
