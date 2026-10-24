/** Primeiro item focável da página: leva o teclado direto ao conteúdo principal. */
export function SkipLink() {
  return (
    <a
      href="#conteudo"
      className="sr-only z-[60] rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      Pular para o conteúdo
    </a>
  )
}
