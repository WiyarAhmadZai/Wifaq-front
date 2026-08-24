import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/rtl.css'
import App from './App.jsx'

// After a new deploy, hashed chunk filenames change. A browser still running
// the OLD index.html will fail to fetch a renamed chunk (lazy route), throwing
// "Failed to fetch dynamically imported module". Recover by reloading once to
// pull the fresh index.html — guarded so a genuinely-missing file can't loop.
window.addEventListener('vite:preloadError', () => {
  const last = Number(sessionStorage.getItem('chunkReloadAt') || 0)
  if (Date.now() - last > 10000) {
    sessionStorage.setItem('chunkReloadAt', String(Date.now()))
    window.location.reload()
  }
})

// NOTE: React.StrictMode intentionally double-invokes effects/renders in
// development, which made every page fetch run twice and the loading
// spinner flash 2–3×. Rendering without it so the UI loads once.
createRoot(document.getElementById('root')).render(<App />)
