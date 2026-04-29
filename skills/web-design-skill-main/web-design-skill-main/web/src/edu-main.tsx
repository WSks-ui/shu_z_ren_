import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import EduApp from './EduApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EduApp />
  </StrictMode>,
)
