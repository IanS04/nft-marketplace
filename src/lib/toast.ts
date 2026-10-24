import type { toast as SonnerToast } from 'sonner'

/*
 * Toasts com o sonner carregado SOB DEMANDA (fora do JavaScript inicial da tela).
 * Mesma API usada no app: toast(), toast.success/error/info/warning.
 *
 * O sonner não reexibe toasts criados antes de o <Toaster> montar; por isso cada chamada espera
 * `toasterReady` (resolvida pelo próprio Toaster ao montar) antes de disparar.
 */
type Toast = typeof SonnerToast

let resolveReady: () => void = () => undefined
const toasterReady = new Promise<void>((resolve) => {
  resolveReady = resolve
})

/** Chamado pelo componente Toaster quando monta. */
export const markToasterReady = () => resolveReady()

const run = (show: (t: Toast) => unknown) => {
  void toasterReady.then(() => import('sonner')).then(({ toast }) => show(toast))
}

export const toast = Object.assign((...args: Parameters<Toast>) => run((t) => t(...args)), {
  success: (...args: Parameters<Toast['success']>) => run((t) => t.success(...args)),
  error: (...args: Parameters<Toast['error']>) => run((t) => t.error(...args)),
  info: (...args: Parameters<Toast['info']>) => run((t) => t.info(...args)),
  warning: (...args: Parameters<Toast['warning']>) => run((t) => t.warning(...args)),
})
