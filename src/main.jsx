import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import JarSetBuilder from './JarSetBuilder'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <JarSetBuilder />
  </StrictMode>
)
