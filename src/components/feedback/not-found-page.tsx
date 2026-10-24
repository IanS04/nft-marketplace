import { Link } from '@tanstack/react-router'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <Container className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-display text-primary">404</p>
      <h1 className="text-heading">Página não encontrada</h1>
      <p className="max-w-md text-muted-foreground">
        O endereço que você acessou não existe ou foi removido.
      </p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </Container>
  )
}
