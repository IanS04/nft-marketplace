import { useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { sessionStore } from '@/services/api/session-store'
import { useSession } from '../hooks/use-session'
import { LazyLoginForm as LoginForm } from './lazy-forms'

const AUTH_PATHS = ['/login', '/register']

/**
 * A sessão expirou com o usuário parado na tela (ex.: preenchendo o checkout).
 * Em vez de redirecionar (e perder o que foi digitado), pede o login aqui mesmo.
 * - Mesmo usuário → o cache é mantido e o que falhou é refeito.
 * - Outro usuário → session-sync descarta os dados privados do anterior.
 */
export function SessionExpiredDialog() {
  const { status, session } = useSession()
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigating = useRouterState({ select: (s) => s.status === 'pending' })
  const previous = useRef(status)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (previous.current === 'authenticated' && status === 'expired') setOpen(true)
    if (status !== 'expired') setOpen(false)
    previous.current = status
  }, [status])

  // O guard já levou para a página de login: ela mesma trata a reautenticação.
  const onAuthPage = AUTH_PATHS.includes(pathname)
  useEffect(() => {
    if (onAuthPage) setOpen(false)
  }, [onAuthPage])

  const leave = async () => {
    setOpen(false)
    sessionStore.signOut()
    await router.invalidate() // em rota privada, o guard leva para o login
  }

  return (
    <Dialog open={open && !onAuthPage && !navigating} onOpenChange={(isOpen) => { if (!isOpen) void leave() }}>
      <DialogContent className="max-w-sm space-y-4" hideClose>
        <div className="space-y-1">
          <DialogTitle>Sua sessão expirou</DialogTitle>
          <DialogDescription>
            Entre novamente para continuar de onde parou. O que você estava fazendo foi mantido.
          </DialogDescription>
        </div>
        <LoginForm idPrefix="reauth" defaultEmail={session?.user.email} onSuccess={() => setOpen(false)} />
        <Button variant="ghost" className="w-full" onClick={() => void leave()}>
          Sair e continuar como visitante
        </Button>
      </DialogContent>
    </Dialog>
  )
}
