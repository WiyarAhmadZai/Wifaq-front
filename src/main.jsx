import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// NOTE: React.StrictMode intentionally double-invokes effects/renders in
// development, which made every page fetch run twice and the loading
// spinner flash 2–3×. Rendering without it so the UI loads once.
createRoot(document.getElementById('root')).render(<App />)
