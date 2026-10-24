import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { forwardRef, useRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { cn } from '@/lib/cn'

// Radix Dialog: foco preso dentro do modal, Esc fecha e o foco volta para quem abriu.
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

interface DialogContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Esconde o "X" (ex.: quando o diálogo exige uma escolha explícita). */
  hideClose?: boolean
}

export const DialogContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  ({ className, children, hideClose = false, onOpenAutoFocus, onCloseAutoFocus, ...props }, ref) => {
    // Sem <DialogTrigger> (diálogos abertos por store), o Radix não sabe a quem devolver o foco.
    // A cada abertura guardamos quem estava focado (antes de o foco entrar no diálogo) e devolvemos ao fechar.
    const openerRef = useRef<HTMLElement | null>(null)
    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          ref={ref}
          onOpenAutoFocus={(event) => {
            openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
            onOpenAutoFocus?.(event)
          }}
          onCloseAutoFocus={(event) => {
            onCloseAutoFocus?.(event)
            const opener = openerRef.current
            if (event.defaultPrevented || !opener?.isConnected) return
            event.preventDefault()
            opener.focus()
          }}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
            'rounded-t-lg border-b-4 border-primary bg-card-elevated p-6 shadow-2xl',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            className,
          )}
          {...props}
        >
          {children}
          {!hideClose && (
            <DialogPrimitive.Close className="absolute right-3 top-3 rounded-sm p-1 text-primary hover:bg-secondary">
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Fechar</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    )
  },
)
DialogContent.displayName = 'DialogContent'

export const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-title', className)} {...props} />
))
DialogTitle.displayName = 'DialogTitle'

export const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-body text-muted-foreground', className)} {...props} />
))
DialogDescription.displayName = 'DialogDescription'
