import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import { getPeekabooMap } from './leafletRegistry.js'
import { PLACE_FEED_STATUS, placeFeedRegistry, visiblePlaceFeeds } from './placeFeeds.js'

const FEEDS = placeFeedRegistry()

function icon(feed) {
  const letter = feed.category === 'park' ? 'N' : feed.category === 'city' ? 'C' : 'P'
  return L.divIcon({
    className: '',
    html: `<div class="place-feed-marker ${feed.publisherClass} ${feed.category}"><span>${letter}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function PlaceDrawer({ feed, onClose }) {
  const official = feed.publisherClass === 'government-official'
  return (
    <aside className="detail-drawer place-feed-drawer open">
      <button className="close-button" onClick={onClose} aria-label="Close place feed">×</button>
      <div className="eyebrow">{official ? 'OFFICIAL PUBLIC PLACE SOURCE' : 'PUBLIC COMMERCIAL PLACE SOURCE'}</div>
      <h2>{feed.name}</h2>
      <div className={`place-source-pill ${official ? 'official' : 'commercial'}`}>{PLACE_FEED_STATUS[feed.status]}</div>
      <div className="place-source-note">
        <strong>SOURCE RECEIPT</strong>
        <span>{feed.publisher}</span>
        <p>{feed.summary}</p>
      </div>
      <div className="field-list official-feed-fields">
        <div className="field-row"><span>Place</span><strong>{feed.place}</strong></div>
        <div className="field-row"><span>Region</span><strong>{feed.region}</strong></div>
        <div className="field-row"><span>Media</span><strong>{feed.media}</strong></div>
        <div className="field-row"><span>Publisher class</span><strong>{official ? 'government official' : 'public commercial'}</strong></div>
        <div className="field-row"><span>Coordinates</span><strong>{feed.lat.toFixed(4)}, {feed.lon.toFixed(4)}</strong></div>
      </div>
      <a className="osm-link official-feed-link" href={feed.url} target="_blank" rel="noopener noreferrer">OPEN PUBLISHED VIEW ↗</a>
      <p className="official-feed-disclaimer">This curated place layer opens the publisher's public page externally. Peekaboo does not copy, restream, scrape hidden media URLs, or imply government ownership for commercial tourism cameras.</p>
    </aside>
  )
}

function PlacePanel({ map, onSelect }) {
  const groups = useMemo(() => ({
    'Parks / nature': FEEDS.filter((feed) => feed.category === 'park'),
    'Cities / traffic': FEEDS.filter((feed) => feed.category === 'city'),
    'Tourism / landmark': FEEDS.filter((feed) => feed.category === 'tourism'),
  }), [])

  const jump = (feed) => {
    map?.setView([feed.lat, feed.lon], feed.category === 'park' ? 12 : 13)
    onSelect(feed)
  }

  return (
    <section className="panel place-source-panel">
      <div className="panel-heading"><span>PLACES + NATURE</span><span>CURATED</span></div>
      <p className="microcopy">A curated public-view index for parks, nature, landmark and tourism cameras. Government sources and public-commercial streams stay visibly separate.</p>
      {Object.entries(groups).map(([label, feeds]) => (
        <div className="place-group" key={label}>
          <strong className="place-group-title">{label}</strong>
          {feeds.map((feed) => (
            <button type="button" className="place-row" key={feed.id} onClick={() => jump(feed)}>
              <span><b>{feed.name}</b><small>{feed.publisher} • {PLACE_FEED_STATUS[feed.status]}</small></span>
              <i>{feed.publisherClass === 'government-official' ? 'OFFICIAL' : 'PUBLIC'}</i>
            </button>
          ))}
        </div>
      ))}
    </section>
  )
}

export default function PlaceFeedEnhancer() {
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
        chip = document.getElementById('peekaboo-place-chip-host')
        if (!chip) {
          chip = document.createElement('span')
          chip.id = 'peekaboo-place-chip-host'
          chip.className = 'place-chip-host'
          chips.appendChild(chip)
        }
        setChipHost(chip)
      }
      const sidebar = document.querySelector('.sidebar')
      if (sidebar) {
        panel = document.getElementById('peekaboo-place-panel-host')
        if (!panel) {
          panel = document.createElement('div')
          panel.id = 'peekaboo-place-panel-host'
          sidebar.appendChild(panel)
        }
        setPanelHost(panel)
      }
      const stage = document.querySelector('.map-stage')
      if (stage) {
        drawer = document.getElementById('peekaboo-place-drawer-host')
        if (!drawer) {
          drawer = document.createElement('div')
          drawer.id = 'peekaboo-place-drawer-host'
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
    return visiblePlaceFeeds(map.getBounds(), FEEDS)
  }, [map, tick])

  useEffect(() => {
    if (!map) return undefined
    const layer = L.layerGroup().addTo(map)
    if (enabled) {
      visible.forEach((feed) => {
        const marker = L.marker([feed.lat, feed.lon], { icon: icon(feed), keyboard: true })
        marker.bindTooltip(`${feed.name} • ${PLACE_FEED_STATUS[feed.status]}`, { direction: 'top', offset: [0, -12] })
        marker.on('click', () => {
          document.querySelectorAll('.detail-drawer.open .close-button').forEach((button) => button.click())
          setSelected(feed)
        })
        marker.addTo(layer)
      })
    }
    return () => {
      layer.clearLayers()
      map.removeLayer(layer)
    }
  }, [map, enabled, visible])

  return (
    <>
      {chipHost && createPortal(
        <button type="button" className={`place-feed-chip ${enabled ? 'active' : ''}`} aria-pressed={enabled} onClick={() => setEnabled((value) => !value)}>
          PLACES <strong>{enabled ? visible.length : FEEDS.length}</strong>
        </button>,
        chipHost,
      )}
      {panelHost && enabled && createPortal(<PlacePanel map={map} onSelect={setSelected} />, panelHost)}
      {drawerHost && selected && createPortal(<PlaceDrawer feed={selected} onClose={() => setSelected(null)} />, drawerHost)}
    </>
  )
}
