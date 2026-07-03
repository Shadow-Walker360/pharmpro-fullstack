import React           from 'react'
import ReactDOM        from 'react-dom/client'
import { BrowserRouter }from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools  } from '@tanstack/react-query-devtools'
import { Toaster }     from 'react-hot-toast'
import App             from './App'
import { queryClient } from './lib/queryClient'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a2235',
              color:      '#f0f4ff',
              border:     '1px solid rgba(255,255,255,.09)',
              borderRadius: '12px',
              fontSize:   '13px',
              fontWeight: '500',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#0d1117' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#0d1117' } },
          }}
        />
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>,
)