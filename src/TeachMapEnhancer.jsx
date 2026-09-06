import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getPeekabooMap } from './leafletRegistry.js'
import { placeFeedRegistry, visiblePlaceFeeds } from './placeFeeds.js'
import { ndbcRegistry, visibleNdbcStations } from './ndbcFeeds.js'
import { RELEASE_LABEL, RELEASE_SHORT } from './release.js'
import {
  hashHasExplicitMap,
  markOnboardingSeen,
  onboardingSeen,
  readSavedView,
  regionalSourceHints,
  writeSavedView,
} from './teachMap.js'

const INITIAL_HASH_HAD_MAP = typeof window !== 'undefined' ? hashHasExplicitMap(window.location.hash) : false
const PLACE_FEEDS = placeFeedRegistry()
const NDBC_FEEDS = ndbcRegistry()

function storage() {
  try { return window.localStorage } catch { return null }
}

function scanButtonState() {
  const button = document.querySelector('.load-button')
  const raw = button?.textContent?.trim().toUpperCase() || ''
  if (raw.includes('QUERYING')) return { label: 'SCANNING OSM…', disabled: true, busy: true }
  if (raw.includes('RESCAN')) return { label: 'RESCAN THIS VIEW', disabled: Boolean(button?.disabled), busy: false }
  return { label: 'SCAN THIS VIEW', disabled: Boolean(button?.disabled), busy: false }
}

function ledgerState() {
  const panel = document.querySelector('.recent-changes-panel')
  if (!panel) return null
  const number = (selector) => Number(panel.querySelector(selector)?.textContent || 0)
  const added = number('.added strong')
  const removed = number('.removed strong')
  const changed = number('.changed strong')
  if (![added, removed, changed].every(Number.isFinite)) return null
  return { added, removed, changed }
}

function stampRelease() {
  const footer = document.querySelector('footer')
  const spans = footer?.querySelectorAll('span') || []
  if (spans[0] && spans[0].textContent !== RELEASE_LABEL) spans[0].textContent = RELEASE_LABEL
  const release = document.querySelector('.release-panel')
  const version = release?.querySelector('.panel-heading span:last-child')
  if (version && version.textContent !== RELEASE_SHORT) version.textContent = RELEASE_SHORT
  const list = release?.querySelector('ul')
  if (list && !list.querySelector('[data-v21-teach-map]')) {
    const item = document.createElement('li')
    item.dataset.v21TeachMap = 'true'
    item.textContent = 'Teach the Map adds first-run guidance, a primary Scan This View control, explicit geolocation, local last-view restore, viewport-aware source coverage hints, and a map-level OSM ledger delta summary.'
    list.prepend(item)
  }
}

function Onboarding({ onDismiss, onLocate, locationStatus }) {
  return (
    <div className="teach-onboarding-backdrop" role="dialog" aria-modal="true" aria-labelledby="teach-onboarding-title">
      <section className="teach-onboarding-card">
        <div className="teach-onboarding-mark"><span /></div>
        <div className="eyebrow">HOW PEEKABOO WORKS</div>
        <h2 id="teach-onboarding-title">Public views are listed. OSM surveillance is scanned on demand.</h2>
        <p>
          Peekaboo combines intentionally public camera sources with public OpenStreetMap surveillance records. It does not discover hidden cameras, probe devices, or treat an empty map as proof that an area has no surveillance.
        </p>
        <div className="teach-onboarding-grid">
          <div><strong>PUBLIC VIEWS</strong><span>Official, institution and clearly labeled public sources can already appear on the map.</span></div>
          <div><strong>SURVEILLANCE</strong><span>Press <b>Scan this view</b> to query public OSM records for the current viewport.</span></div>
          <div><strong>PROVENANCE</strong><span>Peekaboo keeps source claims, reachability and physical verification separate.</span></div>
        </div>
        {locationStatus && <div className="teach-location-status" role="status">{locationStatus}</div>}
        <div className="teach-onboarding-actions">
          <button type="button" className="primary" onClick={onLocate}>USE MY LOCATION</button>
          <button type="button" onClick={onDismiss}>EXPLORE MAP</button>
        </div>
        <small>Location is requested only when you press the button. Peekaboo stores your last map viewport locally in this browser.</small>
      </section>
    </div>
  )
}

function CoveragePanel({ hints, expanded, onToggle }) {
  const visibleHints = expanded ? hints : hints.slice(0, 3)
  return (
    <section className={`teach-coverage ${expanded ? 'expanded' : ''}`}>
      <button className="teach-coverage-toggle" type="button" onClick={onToggle} aria-expanded={expanded}>
        <span>WHAT WORKS HERE</span>
        <strong>{hints.length}</strong>
      </button>
      <div className="teach-coverage-list">
        {visibleHints.map((hint) => (
          <div className={`teach-source-hint status-${hint.status.toLowerCase().replaceAll(' ', '-')}`} key={hint.id}>
            <span><b>{hint.label}</b><small>{hint.note}</small></span>
            <i>{hint.status}</i>
          </div>
        ))}
      </div>
      {!expanded && hints.length > visibleHints.length && <button className="teach-more" type="button" onClick={onToggle}>+{hints.length - visibleHints.length} MORE</button>}
      <footer>GLOBAL OSM • U.S.-HEAVY OFFICIAL SOURCE COVERAGE</footer>
    </section>
  )
}

function LedgerPulse({ delta, onOpen }) {
  if (!delta) return null
  const total = delta.added + delta.removed + delta.changed
  if (!total) return null
  return (
    <button type="button" className="teach-ledger-pulse" onClick={onOpen} title="Open the OSM change ledger">
      <span>OSM CHANGES</span>
      <b>+{delta.added} NEW</b>
      <b>−{delta.removed} REMOVED</b>
      <b>~{delta.changed} CHANGED</b>
    </button>
  )
}

export default function TeachMapEnhancer() {
  const [map, setMap] = useState(() => getPeekabooMap())
  const [host, setHost] = useState(null)
  const [view, setView] = useState(null)
  const [scan, setScan] = useState(scanButtonState)
  const [delta, setDelta] = useState(ledgerState)
  const [coverageOpen, setCoverageOpen] = useState(false)
  const [locationStatus, setLocationStatus] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(() => !onboardingSeen(storage()))

  useEffect(() => {
    const receive = () => setMap(getPeekabooMap())
    receive()
    window.addEventListener('peekaboo:leaflet-map-ready', receive)
    return () => window.removeEventListener('peekaboo:leaflet-map-ready', receive)
  }, [])

  useEffect(() => {
    let created = null
    const attach = () => {
      stampRelease()
      const stage = document.querySelector('.map-stage')
      if (!stage) return false
      let target = document.getElementById('peekaboo-teach-map-host')
      if (!target) {
        target = document.createElement('div')
        target.id = 'peekaboo-teach-map-host'
        stage.appendChild(target)
        created = target
      }
      setHost(target)
      return true
    }
    if (attach()) return () => { if (created?.isConnected) created.remove() }
    const observer = new MutationObserver(() => {
      if (attach()) observer.disconnect()
    })
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      if (created?.isConnected) created.remove()
    }
  }, [])

  useEffect(() => {
    const root = document.getElementById('root') || document.body
    const sync = () => {
      const nextScan = scanButtonState()
      setScan((current) => current.label === nextScan.label && current.disabled === nextScan.disabled && current.busy === nextScan.busy ? current : nextScan)
      const nextDelta = ledgerState()
      setDelta((current) => JSON.stringify(current) === JSON.stringify(nextDelta) ? current : nextDelta)
      stampRelease()
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!map) return undefined
    let restoring = false
    if (!INITIAL_HASH_HAD_MAP) {
      const saved = readSavedView(storage())
      if (saved) {
        restoring = true
        map.setView([saved.lat, saved.lon], saved.zoom, { animate: false })
        window.setTimeout(() => { restoring = false }, 350)
      }
    }

    const sync = () => {
      const center = map.getCenter()
      const next = { lat: center.lat, lon: center.lng, zoom: map.getZoom(), bounds: map.getBounds() }
      setView(next)
      if (!restoring) writeSavedView(storage(), next)
    }
    sync()
    map.on('moveend zoomend', sync)
    return () => map.off('moveend zoomend', sync)
  }, [map])

  const hints = useMemo(() => {
    if (!view) return [{ id: 'osm', label: 'OpenStreetMap surveillance', status: 'SCAN ON DEMAND', note: 'Global public OSM surveillance records are queried only when you press Scan this view.' }]
    const next = [
      { id: 'osm', label: 'OpenStreetMap surveillance', status: 'SCAN ON DEMAND', note: 'Global public OSM surveillance records are queried only when you press Scan this view.' },
      ...regionalSourceHints(view.lat, view.lon),
    ]
    const places = visiblePlaceFeeds(view.bounds, PLACE_FEEDS)
    const buoys = visibleNdbcStations(view.bounds, NDBC_FEEDS)
    if (places.length) next.push({ id: 'curated-here', label: 'Curated public views', status: `${places.length} IN VIEW`, note: 'Park, wildlife, institution, aviation, Great Lakes, city or tourism sources are curated inside this viewport.' })
    if (buoys.length) next.push({ id: 'ndbc-here', label: 'NOAA BuoyCAMs', status: `${buoys.length} IN VIEW`, note: 'Vetted NOAA/NDBC BuoyCAM stations are inside the current viewport.' })
    return next
  }, [view])

  const dismissOnboarding = () => {
    markOnboardingSeen(storage())
    setShowOnboarding(false)
  }

  const locate = () => {
    if (!navigator.geolocation) {
      setLocationStatus('This browser does not expose geolocation.')
      return
    }
    setLocationStatus('REQUESTING LOCATION…')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude
        map?.setView([lat, lon], 14)
        setLocationStatus('LOCATION FOUND • MAP MOVED')
        markOnboardingSeen(storage())
        window.setTimeout(() => setShowOnboarding(false), 500)
      },
      (error) => {
        const text = error?.code === 1 ? 'LOCATION PERMISSION WAS NOT GRANTED' : 'LOCATION COULD NOT BE RESOLVED'
        setLocationStatus(text)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  }

  const triggerScan = () => {
    const button = document.querySelector('.load-button')
    if (button && !button.disabled) button.click()
  }

  const openLedger = () => {
    document.documentElement.classList.add('peekaboo-sidebar-open')
    window.setTimeout(() => document.querySelector('.ledger-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  return (
    <>
      {host && createPortal(
        <>
          <div className="teach-primary-actions">
            <button type="button" className={`teach-scan ${scan.busy ? 'busy' : ''}`} onClick={triggerScan} disabled={scan.disabled}>
              <span className="teach-scan-eye" />
              {scan.label}
            </button>
            <button type="button" className="teach-locate" onClick={locate} title="Move the map to your current location">◎</button>
          </div>
          <CoveragePanel hints={hints} expanded={coverageOpen} onToggle={() => setCoverageOpen((value) => !value)} />
          <LedgerPulse delta={delta} onOpen={openLedger} />
        </>,
        host,
      )}
      {showOnboarding && <Onboarding onDismiss={dismissOnboarding} onLocate={locate} locationStatus={locationStatus} />}
    </>
  )
}
