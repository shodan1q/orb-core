import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { MagOrbConsole } from './MagOrbConsole'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MagOrbConsole />
  </StrictMode>,
)
