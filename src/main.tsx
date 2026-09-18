import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import './styles/solid-surface.css'
import './styles/theme-dark.css'
import App from './app/App.tsx'
import { installQuietScrollbars } from './lib/quiet-scrollbars'

installQuietScrollbars()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
