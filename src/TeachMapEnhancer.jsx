import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getPeekabooMap } from './leafletRegistry.js'
import { placeFeedRegistry, visiblePlaceFeeds } from './placeFeeds.js'
import { ndbcRegistry, visibleNdbcStations } from './ndbcFeeds.js'
import { RELEASE_LABEL, RELEASE_SHORT } from './release.js'
import { useProductState } from './productState.jsx'
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

function stampRelease() {
  const footer = document.querySelector('footer')
  const spans = footer?.querySelectorAll('span') || []
  if (spans[0] && spans[0].textContent !== RELEASE_LABEL) spans[0].textContent = RELEASE_LABEL
  const release = document.querySelector('.release-panel')
  const version = release?.querySelector('.panel-heading span:last-child')
  if (version && version.textContent !== RELEASE_SHORT) version.textContent = RELEASE_SHORT
  const list = release?.querySelector('ul')
  if (list && !list.querySelector('[data-v22-product-state]')) {
    const item = document.createElement('li')
    item.dataset.v22ProductState = 'true'
    item.textContent = 'v2.2 moves scan/view/ledger product state out of DOM scraping, adds Surveillance / Public Views modes, OSM in-view browsing and selected-record permalinks.'
    list.prepend(item)
  }
  if (list && !list.querySelector('[data-v21-teach-map]')) {
    const item = document.createElement('li')
    item.dataset.v21TeachMap = 'true'
    item.textContent = 'Teach the Map adds first-run guidance, a primary Scan This View control, explicit geolocation, local last-view restore, viewport-aware source coverage hints, and a map-level OSM ledger delta summary.'
    list.appendChild(item)
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

function CoveragePanel({ hints, expanded, onToggle, onHelp }) {
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
      <div className="teach-coverage-footer">
        <button type="button" onClick={onHelp}>HOW THIS MAP WORKS</button>
        <span>GLOBAL OSM • U.S.-HEAVY OFFICIAL SOURCE COVERAGE</span>
      </div>
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
      <b>−{delta.removed} REMOVED FROM OSM</b>
      <b>~{delta.changed} CHANGED</b>
    </button>
  )
}

export default function TeachMapEnhancer() {
  const { snapshot, invoke } = useProductState()
  const [map, setMap] = useState(() => getPeekabooMap())
  const [host, setHost] = useState(null)
  const [coverageOpen, setCoverageOpen] = useState(false)
  const [locationStatus, setLocationStatus] = useState('')
  const [scanNudge, setScanNudge] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => !onboardingSeen(storage()))
  const [restoreReady, setRestoreReady] = useState(INITIAL_HASH_HAD_MAP)

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
    if (!map || INITIAL_HASH_HAD_MAP) {
      if (map) setRestoreReady(true)
      return
    }
    const saved = readSavedView(storage())
    if (saved) map.setView([saved.lat, saved.lon], saved.zoom, { animate: false })
    const timer = window.setTimeout(() => setRestoreReady(true), saved ? 180 : 0)
    return () => window.clearTimeout(timer)
  }, [map])

  useEffect(() => {
    if (!restoreReady || !snapshot.view) return
    writeSavedView(storage(), snapshot.view)
  }, [restoreReady, snapshot.view])

  const hints = useMemo(() => {
    const osm = {
      id: 'osm',
      label: 'OpenStreetMap surveillance',
      status: 'SCAN ON DEMAND',
      note: 'Global public OSM surveillance records are queried only when you press Scan this view.',
    }
    const view = snapshot.view
    if (!view) return [osm]

    const regional = regionalSourceHints(view.lat, view.lon)
    const next = [...regional, osm]
    const places = visiblePlaceFeeds(view.bounds, PLACE_FEEDS)
    const buoys = visibleNdbcStations(view.bounds, NDBC_FEEDS)
    if (places.length) next.push({ id: 'curated-here', label: 'Curated public views', status: `${places.length} IN VIEW`, note: 'Park, wildlife, institution, aviation, Great Lakes, city or tourism sources are curated inside this viewport.' })
    if (buoys.length) next.push({ id: 'ndbc-here', label: 'NOAA BuoyCAMs', status: `${buoys.length} IN VIEW`, note: 'Vetted NOAA/NDBC BuoyCAM stations are inside the current viewport.' })
    return next
  }, [snapshot.view])

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
        setLocationStatus('LOCATION FOUND • MAP MOVED • SCAN THIS VIEW WHEN READY')
        setScanNudge(true)
        window.setTimeout(() => setScanNudge(false), 4200)
        markOnboardingSeen(storage())
        window.setTimeout(() => setShowOnboarding(false), 650)
      },
      (error) => {
        const text = error?.code === 1 ? 'LOCATION PERMISSION WAS NOT GRANTED' : 'LOCATION COULD NOT BE RESOLVED'
        setLocationStatus(text)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  }

  const triggerScan = () => invoke('scan', false)
  const openLedger = () => invoke('openLedger')

  return (
    <>
      {host && createPortal(
        <>
          <div className="teach-primary-actions">
            <button
              type="button"
              className={`teach-scan ${snapshot.scan.loading ? 'busy' : ''} ${scanNudge ? 'nudge' : ''}`.trim()}
              onClick={triggerScan}
              disabled={!snapshot.scan.canScan}
            >
              <span className="teach-scan-eye" />
              {snapshot.scan.label}
            </button>
            <button type="button" className="teach-locate" onClick={locate} title="Move the map to your current location">◎</button>
          </div>
          <CoveragePanel
            hints={hints}
            expanded={coverageOpen}
            onToggle={() => setCoverageOpen((value) => !value)}
            onHelp={() => setShowOnboarding(true)}
          />
          <LedgerPulse delta={snapshot.ledgerDelta} onOpen={openLedger} />
        </>,
        host,
      )}
      {showOnboarding && <Onboarding onDismiss={dismissOnboarding} onLocate={locate} locationStatus={locationStatus} />}
    </>
  )
}
