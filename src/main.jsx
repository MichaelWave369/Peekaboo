import React from 'react'
import ReactDOM from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import './v04.css'
import './robustness.css'
import './ledger.css'
import './v07.css'
import './v10.css'
import App from './App.jsx'
import AddressSearchPortal from './AddressSearchPortal.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <AddressSearchPortal />
    </ErrorBoundary>
  </React.StrictMode>,
)
