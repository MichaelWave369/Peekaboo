import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import AddressSearch from './AddressSearch.jsx'

const RELEASE_LABEL = 'PEEKABOO v0.7'

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

  useEffect(() => {
    let createdHost = null

    const attach = () => {
      stampRelease()
      const sidebar = document.querySelector('.sidebar')
      if (!sidebar) return false

      let target = document.getElementById('peekaboo-address-search-host')
      if (!target) {
        target = document.createElement('div')
        target.id = 'peekaboo-address-search-host'
        const intro = sidebar.querySelector('.intro-panel')
        if (intro?.nextSibling) sidebar.insertBefore(target, intro.nextSibling)
        else sidebar.appendChild(target)
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
  return createPortal(<AddressSearch onNavigate={navigateToPlace} />, host)
}
