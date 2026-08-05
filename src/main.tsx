import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider, applyInitialTheme } from './theme.tsx'
import { TimelineDesignProvider } from './timelineDesign.tsx'
import { registerServiceWorker } from './utils/pushNotifications'
import { ConfirmProvider } from './components/ConfirmDialog.tsx'
import { AmountProvider } from './components/AmountDialog.tsx'

applyInitialTheme()
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TimelineDesignProvider>
        <ConfirmProvider>
          <AmountProvider>
            <App />
          </AmountProvider>
        </ConfirmProvider>
      </TimelineDesignProvider>
    </ThemeProvider>
  </StrictMode>,
)
