import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { isSupabaseConfigured } from './lib/supabase'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { AuthProvider } from './contexts/AuthContext'
import { SetupRequired } from './components/SetupRequired'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      {isSupabaseConfigured ? (
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter><App /></BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      ) : <SetupRequired />}
    </ThemeProvider>
  </StrictMode>,
)
