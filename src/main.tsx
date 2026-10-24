import './styles/index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { markNetworkReady } from './app/network-ready'
import { Providers } from './app/providers'
import { queryClient } from './app/query-client'
import { bindSessionToCache } from './app/session-sync'
import { enableMocking } from './mocks'

bindSessionToCache(queryClient)

// Renderiza já: o que não depende de dados (shell, hero, skeletons) aparece sem esperar os mocks.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers />
  </StrictMode>,
)

// A rede só abre quando o MSW estiver interceptando (as requisições aguardam em http.ts).
void enableMocking()
  .catch((error: unknown) => console.error('Falha ao iniciar os mocks:', error))
  .finally(markNetworkReady)
