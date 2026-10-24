/**
 * "Porta" da rede: o app RENDERIZA imediatamente (shell, hero, skeletons), mas nenhuma requisição
 * sai antes de os mocks (MSW) estarem interceptando. Sem isso, o primeiro desenho esperava o download
 * e o registro do service worker do MSW (~1s no mobile do Lighthouse).
 *
 * Quem usa: o interceptor do Axios (http.ts) e o socket (só conecta depois).
 */
let open: () => void = () => undefined

export const networkReady = new Promise<void>((resolve) => {
  open = resolve
})

export const markNetworkReady = () => open()
