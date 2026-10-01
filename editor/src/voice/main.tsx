import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { VoiceReviewApp } from './VoiceReviewApp'
import './voice.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VoiceReviewApp />
  </StrictMode>,
)
