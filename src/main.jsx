import React from 'react'
import ReactDOM from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import './v04.css'
import './robustness.css'
import './ledger.css'
import './v07.css'
import './v10.css'
import './v11.css'
import './v12.css'
import './v13.css'
import './v14.css'
import './v15.css'
import './leafletRegistry.js'
import App from './App.jsx'
import AddressSearchPortal from './AddressSearchPortal.jsx'
import PublicCamEnhancer from './PublicCamEnhancer.jsx'
import OfficialFeedEnhancer from './OfficialFeedEnhancer.jsx'
import CaltransFeedEnhancer from './CaltransFeedEnhancer.jsx'
import IowaFeedEnhancer from './IowaFeedEnhancer.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <AddressSearchPortal />
      <PublicCamEnhancer />
      <OfficialFeedEnhancer />
      <CaltransFeedEnhancer />
      <IowaFeedEnhancer />
    </ErrorBoundary>
  </React.StrictMode>,
)
