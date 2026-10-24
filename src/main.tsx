import '@fontsource-variable/jetbrains-mono'
import './styles/index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Providers } from './app/providers'
import { queryClient } from './app/query-client'
import { bindSessionToCache } from './app/session-sync'
import { enableMocking } from './mocks'

async function bootstrap() {
  // Os mocks precisam estar ativos ANTES da primeira requisição da aplicação.
  await enableMocking()
  bindSessionToCache(queryClient)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Providers />
    </StrictMode>,
  )
}

void bootstrap()
