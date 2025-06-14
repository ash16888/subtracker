import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('Main.tsx loaded')

function init() {
  console.log('Init function called')
  const rootElement = document.getElementById('root')
  console.log('Root element:', rootElement)

  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    console.log('App rendered')
  } else {
    console.error('Root element not found!')
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
