import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import AddressSearch from './AddressSearch.jsx'
import { RELEASE_LABEL } from './release.js'

function zoomForPlace(place) {
  if (!place?.bounds) return 16
  const latSpan = Math.abs(place.bounds.north - place.bounds.south)
  const lonSpan = Math.abs(place.bounds.east - place.bounds.west)
  const span = Math.max(latSpan, lonSpan)
  if (span > 20) return 4
  if (span > 8) return 5
  if (span > 3) return 6
  if (span > 1) return 8
  if (span > 0.35) return 10
  if (span > 0.12) return 11
  if (span > 0.04) return 13
  if (span > 0.01) return 15
  return 17
}

function navigateToPlace(place) {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const zoom = zoomForPlace(place)
  params.set('map', `${zoom}/${place.lat.toFixed(5)}/${place.lon.toFixed(5)}`)
  const next = `${window.location.pathname}${window.location.search}#${params.toString()}`
  window.location.assign(next)
  window.location.reload()
}

function stampRelease() {
  const version = document.querySelector('footer span:first-child')
  if (version && version.textContent !== RELEASE_LABEL) version.textContent = RELEASE_LABEL
}

export default function AddressSearchPortal() {
  const [host, setHost] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth > 860)

  useEffect(() => {
    document.documentElement.classList.toggle('peekaboo-sidebar-open', sidebarOpen)
    return () => document.documentElement.classList.remove('peekaboo-sidebar-open')
  }, [sidebarOpen])

  useEffect(() => {
    const onSetSidebar = (event) => {
      if (event?.detail?.open === false) setSidebarOpen(false)
      else setSidebarOpen(true)
    }
    window.addEventListener('peekaboo:set-sidebar', onSetSidebar)
    return () => window.removeEventListener('peekaboo:set-sidebar', onSetSidebar)
  }, [])

  useEffect(() => {
    let createdHost = null

    const attach = () => {
      stampRelease()
      const mapStage = document.querySelector('.map-stage')
      if (!mapStage) return false

      let target = document.getElementById('peekaboo-address-search-host')
      if (!target) {
        target = document.createElement('div')
        target.id = 'peekaboo-address-search-host'
        mapStage.appendChild(target)
        createdHost = target
      }
      setHost(target)
      return true
    }

    if (attach()) return () => {
      if (createdHost?.isConnected) createdHost.remove()
    }

    const observer = new MutationObserver(() => {
      if (attach()) observer.disconnect()
    })
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      if (createdHost?.isConnected) createdHost.remove()
    }
  }, [])

  if (!host) return null
  return createPortal(
    <div className="v1-map-searchbar">
      <button
        type="button"
        className="v1-menu-button"
        aria-label={sidebarOpen ? 'Hide Peekaboo data panel' : 'Show Peekaboo data panel'}
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>
      <AddressSearch onNavigate={navigateToPlace} />
    </div>,
    host,
  )
}
