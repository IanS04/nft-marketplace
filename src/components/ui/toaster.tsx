import { useEffect } from 'react'
import { Toaster as Sonner } from 'sonner'
import { markToasterReady } from '@/lib/toast'

/** Toasts de feedback das mutations. O sonner já anuncia cada toast numa live region. */
export function Toaster() {
  // Libera os toasts enfileirados (ver lib/toast.ts).
  useEffect(markToasterReady, [])
  return (
    <Sonner
      position="top-center"
      theme="dark"
      closeButton
      // Mobile: abaixo dos botões que ficam sobre a imagem (voltar/favoritar), para não bloqueá-los.
      mobileOffset={{ top: '4.5rem' }}
      toastOptions={{
        classNames: {
          toast: '!rounded-lg !border !border-border !bg-card-elevated !font-sans !text-body !text-foreground',
          description: '!text-muted-foreground',
          success: '!border-success/60',
          error: '!border-destructive/70',
        },
      }}
    />
  )
}
