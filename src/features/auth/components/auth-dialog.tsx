import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'
import { authDialog, useAuthDialog, type AuthMode } from '../auth-dialog-store'
import { LazyLoginForm as LoginForm, LazyRegisterForm as RegisterForm } from './lazy-forms'
import { SocialLogin } from './social-login'
import { AUTH_INTRO } from '../copy'

const MODES: { mode: AuthMode; label: string }[] = [
  { mode: 'login', label: 'Entrar' },
  { mode: 'register', label: 'Criar conta' },
]

/** Modal do desktop (Figma: sobre a página atual). Fechar ou entrar mantém o usuário onde estava. */
export function AuthDialog() {
  const { open, mode } = useAuthDialog()
  const baseId = useId()
  const introId = `${baseId}-intro`
  const tabRefs = useRef<Record<AuthMode, HTMLButtonElement | null>>({ login: null, register: null })
  // Ao abrir, o formulário foca o 1º campo; ao trocar de aba, o foco fica na aba (padrão WAI-ARIA).
  const [focusOnMount, setFocusOnMount] = useState(true)
  useEffect(() => { if (open) setFocusOnMount(true) }, [open])
  const switchMode = (next: AuthMode) => {
    setFocusOnMount(false)
    authDialog.setMode(next)
  }

  // Padrão de abas: setas alternam entre "Entrar" e "Criar conta".
  const onTabKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    const next: AuthMode = mode === 'login' ? 'register' : 'login'
    switchMode(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) authDialog.close() }}>
      <DialogContent
        aria-describedby={introId}
        className="max-w-sm space-y-4"
        // Foco no 1º campo (o próprio formulário foca ao montar), não na aba
        onOpenAutoFocus={(event) => {
          event.preventDefault()
        }}
      >
        <DialogTitle className="sr-only">{mode === 'login' ? 'Entrar' : 'Criar conta'}</DialogTitle>
        <div role="tablist" aria-label="Entrar ou criar conta" className="flex items-center justify-center gap-2 text-title">
          {MODES.map(({ mode: tabMode, label }, i) => (
            <span key={tabMode} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true" className="text-foreground">|</span>}
              <button
                ref={(el) => { tabRefs.current[tabMode] = el }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tabMode}`}
                aria-selected={mode === tabMode}
                aria-controls={`${baseId}-panel`}
                tabIndex={mode === tabMode ? 0 : -1}
                onClick={() => switchMode(tabMode)}
                onKeyDown={onTabKeyDown}
                className={cn('font-normal', mode === tabMode ? 'text-primary underline underline-offset-8' : 'text-foreground hover:text-primary')}
              >
                {label}
              </button>
            </span>
          ))}
        </div>
        <p id={introId} className="text-center text-micro text-foreground">{AUTH_INTRO[mode]}</p>
        <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${mode}`}>
          {mode === 'login' ? (
            <LoginForm idPrefix="dialog" onSuccess={authDialog.close} autoFocus={focusOnMount} />
          ) : (
            <RegisterForm idPrefix="dialog" onSuccess={authDialog.close} autoFocus={focusOnMount} />
          )}
        </div>
        <SocialLogin />
      </DialogContent>
    </Dialog>
  )
}
