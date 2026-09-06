import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import { getPeekabooMap } from './leafletRegistry.js'
import { NDBC_BUOYCAM_MAP, ndbcImageUrl, ndbcRegistry, visibleNdbcStations } from './ndbcFeeds.js'

const STATIONS = ndbcRegistry()

function buoyIcon() {
  return L.divIcon({
    className: '',
    html: '<div class="ndbc-feed-marker"><span>≈</span></div>',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function NdbcDrawer({ station, onClose }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [token, setToken] = useState(0)
  const imageUrl = ndbcImageUrl(station.station, token || null)

  useEffect(() => {
    setLoaded(false)
    setError(false)
    setToken(0)
  }, [station.station])

  return (
    <aside className="detail-drawer ndbc-feed-drawer open">
      <button className="close-button" onClick={onClose} aria-label="Close NOAA BuoyCAM details">×</button>
      <div className="eyebrow">OFFICIAL OCEAN SOURCE / NOAA NDBC</div>
      <h2>{station.name}</h2>
      <div className="ndbc-source-pill">BUOYCAM {station.station}</div>

      <div className="ndbc-source-note">
        <strong>CURRENT-IMAGE CONTRACT</strong>
        <span>NOAA National Data Buoy Center / BuoyCAM</span>
        <p>NDBC documents this station endpoint as the most recent BuoyCAM image. BuoyCAMs generally photograph during daylight; NDBC returns an error instead of a current image when the latest photo is older than 16 hours.</p>
      </div>

      {!loaded && !error && (
        <button className="ndbc-media-load" type="button" onClick={() => { setError(false); setLoaded(true) }}>
          LOAD CURRENT NOAA IMAGE
        </button>
      )}

      {loaded && !error && (
        <div className="ndbc-media-box">
          <img src={imageUrl} alt={`NOAA NDBC BuoyCAM ${station.station} — ${station.name}`} onError={() => setError(true)} />
          <button type="button" onClick={() => { setError(false); setToken(Date.now()); setLoaded(true) }}>REFRESH CURRENT IMAGE</button>
          <small>The image is requested directly from NOAA/NDBC only after you press load. Nighttime, station outages, or an image older than NDBC's current-image window can produce no image.</small>
        </div>
      )}

      {error && (
        <div className="official-feed-error" role="alert">
          <strong>NO CURRENT BUOYCAM IMAGE AVAILABLE</strong>
          <span>NDBC may be between daylight photos, the latest image may be older than 16 hours, or the station may be temporarily unavailable. Peekaboo does not guess alternate image paths.</span>
          <button type="button" onClick={() => { setError(false); setToken(Date.now()); setLoaded(true) }}>TRY AGAIN</button>
        </div>
      )}

      <div className="field-list official-feed-fields">
        <div className="field-row"><span>Station</span><strong>{station.station}</strong></div>
        {station.detail && <div className="field-row"><span>Location note</span><strong>{station.detail}</strong></div>}
        <div className="field-row"><span>Publisher</span><strong>NOAA / NDBC</strong></div>
        <div className="field-row"><span>Media</span><strong>DAYLIGHT CURRENT IMAGE</strong></div>
        <div className="field-row"><span>Coordinates</span><strong>{station.lat.toFixed(3)}, {station.lon.toFixed(3)}</strong></div>
      </div>

      <a className="osm-link official-feed-link" href={station.stationUrl} target="_blank" rel="noopener noreferrer">OPEN NOAA STATION PAGE ↗</a>
      <a className="osm-link official-feed-link secondary" href={station.mapUrl} target="_blank" rel="noopener noreferrer">OPEN NOAA BUOYCAM MAP ↗</a>
      <p className="official-feed-disclaimer">This layer uses only NOAA's documented public BuoyCAM station and current-image URLs. It does not discover cameras or infer undocumented media endpoints.</p>
    </aside>
  )
}

function NdbcPanel({ visible, onSelect }) {
  return (
    <section className="panel ndbc-source-panel">
      <div className="panel-heading"><span>OCEAN + WEATHER CAMS</span><span>NOAA NDBC</span></div>
      <p className="microcopy">Vetted NOAA National Data Buoy Center BuoyCAM stations. The registry supplies station geography; actual current images are requested from NOAA only after user action.</p>
      <div className="ndbc-summary-grid">
        <div><span>Seed registry</span><strong>{STATIONS.length}</strong></div>
        <div><span>Current view</span><strong>{visible.length}</strong></div>
      </div>
      {visible.length ? (
        <div className="ndbc-station-list">
          {visible.map((station) => (
            <button type="button" key={station.station} onClick={() => onSelect(station)}>
              <span><strong>{station.station} • {station.name}</strong><small>{station.detail || 'NOAA BuoyCAM'}</small></span>
              <b>OPEN</b>
            </button>
          ))}
        </div>
      ) : (
        <div className="ndbc-empty-note">No seeded NDBC BuoyCAM stations are inside this viewport. This does not mean NOAA has no marine observations here; this layer is specifically the BuoyCAM subset.</div>
      )}
      <a className="official-source-external" href={NDBC_BUOYCAM_MAP} target="_blank" rel="noopener noreferrer">OPEN FULL NOAA BUOYCAM MAP ↗</a>
    </section>
  )
}

export default function NdbcFeedEnhancer() {
  const [map, setMap] = useState(() => getPeekabooMap())
  const [enabled, setEnabled] = useState(false)
  const [selected, setSelected] = useState(null)
  const [tick, setTick] = useState(0)
  const [chipHost, setChipHost] = useState(null)
  const [panelHost, setPanelHost] = useState(null)
  const [drawerHost, setDrawerHost] = useState(null)

  useEffect(() => {
    const receive = () => setMap(getPeekabooMap())
    receive()
    window.addEventListener('peekaboo:leaflet-map-ready', receive)
    return () => window.removeEventListener('peekaboo:leaflet-map-ready', receive)
  }, [])

  useEffect(() => {
    if (!map) return undefined
    const update = () => setTick((value) => value + 1)
    map.on('moveend zoomend', update)
    return () => map.off('moveend zoomend', update)
  }, [map])

  useEffect(() => {
    let chip
    let panel
    let drawer
    const attach = () => {
      const chips = document.querySelector('.map-filter-chips')
      if (chips) {
        chip = document.getElementById('peekaboo-ndbc-chip-host')
        if (!chip) {
          chip = document.createElement('span')
          chip.id = 'peekaboo-ndbc-chip-host'
          chip.className = 'ndbc-chip-host'
          chips.appendChild(chip)
        }
        setChipHost(chip)
      }
      const sidebar = document.querySelector('.sidebar')
      if (sidebar) {
        panel = document.getElementById('peekaboo-ndbc-panel-host')
        if (!panel) {
          panel = document.createElement('div')
          panel.id = 'peekaboo-ndbc-panel-host'
          sidebar.appendChild(panel)
        }
        setPanelHost(panel)
      }
      const stage = document.querySelector('.map-stage')
      if (stage) {
        drawer = document.getElementById('peekaboo-ndbc-drawer-host')
        if (!drawer) {
          drawer = document.createElement('div')
          drawer.id = 'peekaboo-ndbc-drawer-host'
          stage.appendChild(drawer)
        }
        setDrawerHost(drawer)
      }
    }
    attach()
    const observer = new MutationObserver(attach)
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      chip?.remove()
      panel?.remove()
      drawer?.remove()
    }
  }, [])

  const visible = useMemo(() => {
    void tick
    if (!map) return []
    return visibleNdbcStations(map.getBounds(), STATIONS)
  }, [map, tick])

  useEffect(() => {
    if (!map) return undefined
    const layer = L.layerGroup().addTo(map)
    if (enabled) {
      visible.forEach((station) => {
        const marker = L.marker([station.lat, station.lon], { icon: buoyIcon(), keyboard: true })
        marker.bindTooltip(`NOAA BuoyCAM ${station.station} • ${station.name}`, { direction: 'top', offset: [0, -12] })
        marker.on('click', () => {
          document.querySelectorAll('.detail-drawer.open .close-button').forEach((button) => button.click())
          setSelected(station)
        })
        marker.addTo(layer)
      })
    }
    return () => {
      layer.clearLayers()
      map.removeLayer(layer)
    }
  }, [map, enabled, visible])

  useEffect(() => {
    if (!selected) return undefined
    const observer = new MutationObserver(() => {
      if (document.querySelector('.detail-drawer.open:not(.ndbc-feed-drawer)')) setSelected(null)
    })
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [selected])

  const toggle = () => {
    setEnabled((value) => {
      const next = !value
      if (!next) setSelected(null)
      return next
    })
  }

  return (
    <>
      {chipHost && createPortal(
        <button type="button" className={`ndbc-feed-chip ${enabled ? 'active' : ''}`} aria-pressed={enabled} onClick={toggle} title="NOAA National Data Buoy Center BuoyCAM current-image stations">
          NOAA BUOYS <strong>{enabled ? visible.length : STATIONS.length}</strong>
        </button>,
        chipHost,
      )}
      {panelHost && enabled && createPortal(<NdbcPanel visible={visible} onSelect={setSelected} />, panelHost)}
      {drawerHost && enabled && selected && createPortal(<NdbcDrawer station={selected} onClose={() => setSelected(null)} />, drawerHost)}
    </>
  )
}
