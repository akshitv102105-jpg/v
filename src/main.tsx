
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext.tsx'

// NOTE: StrictMode temporarily disabled for debugging jumping issue
// StrictMode in React 18 double-renders and remounts effects, which can cause flashing
ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
  <AuthProvider>
    <App />
  </AuthProvider>
  // </React.StrictMode>,
)

