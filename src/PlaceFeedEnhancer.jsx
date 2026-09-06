import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import { getPeekabooMap } from './leafletRegistry.js'
import { PLACE_FEED_STATUS, placeFeedRegistry, visiblePlaceFeeds } from './placeFeeds.js'

const FEEDS = placeFeedRegistry()
const MODE = {
  all: { label: 'PLACES', categories: null },
  wildlife: { label: 'WILDLIFE', categories: ['wildlife'] },
  aviation: { label: 'FAA WX', categories: ['aviation'] },
}

function feedsForMode(mode) {
  const categories = MODE[mode]?.categories
  return categories ? FEEDS.filter((feed) => categories.includes(feed.category)) : FEEDS
}

function icon(feed) {
  const letter = feed.category === 'park' ? 'N'
    : feed.category === 'city' ? 'C'
      : feed.category === 'wildlife' ? 'W'
        : feed.category === 'aviation' ? 'A'
          : 'P'
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
        <div className="field-row"><span>Category</span><strong>{feed.category}</strong></div>
        <div className="field-row"><span>Media</span><strong>{feed.media}</strong></div>
        <div className="field-row"><span>Publisher class</span><strong>{official ? 'government official' : 'public commercial'}</strong></div>
        <div className="field-row"><span>Coordinates</span><strong>{feed.lat.toFixed(4)}, {feed.lon.toFixed(4)}</strong></div>
      </div>
      <a className="osm-link official-feed-link" href={feed.url} target="_blank" rel="noopener noreferrer">OPEN PUBLISHED VIEW ↗</a>
      <p className="official-feed-disclaimer">This curated source opens the publisher's public page externally. Peekaboo does not copy, restream, scrape hidden media URLs, or promote partner/third-party imagery into a stronger ownership claim.</p>
    </aside>
  )
}

function PlacePanel({ map, onSelect, feeds, mode }) {
  const groups = useMemo(() => ({
    'Parks / nature': feeds.filter((feed) => feed.category === 'park'),
    'Wildlife / refuges': feeds.filter((feed) => feed.category === 'wildlife'),
    'Aviation weather': feeds.filter((feed) => feed.category === 'aviation'),
    'Cities / traffic': feeds.filter((feed) => feed.category === 'city'),
    'Tourism / landmark': feeds.filter((feed) => feed.category === 'tourism'),
  }), [feeds])

  const jump = (feed) => {
    const zoom = feed.category === 'aviation' ? 11 : feed.category === 'park' || feed.category === 'wildlife' ? 12 : 13
    map?.setView([feed.lat, feed.lon], zoom)
    onSelect(feed)
  }

  return (
    <section className="panel place-source-panel">
      <div className="panel-heading"><span>{MODE[mode]?.label || 'PLACES'} SOURCES</span><span>CURATED</span></div>
      <p className="microcopy">Curated public-view sources with government and public-commercial publishers kept visibly separate. Wildlife and FAA shortcuts are filtered views of this same provenance lane.</p>
      {Object.entries(groups).filter(([, entries]) => entries.length).map(([label, entries]) => (
        <div className="place-group" key={label}>
          <strong className="place-group-title">{label}</strong>
          {entries.map((feed) => (
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
  const [mode, setMode] = useState('all')
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

  const modeFeeds = useMemo(() => feedsForMode(mode), [mode])
  const visible = useMemo(() => {
    void tick
    if (!map) return []
    return visiblePlaceFeeds(map.getBounds(), modeFeeds)
  }, [map, tick, modeFeeds])

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

  useEffect(() => {
    if (!enabled) setSelected(null)
    if (selected && !modeFeeds.some((feed) => feed.id === selected.id)) setSelected(null)
  }, [enabled, modeFeeds, selected])

  useEffect(() => {
    if (!selected) return undefined
    const observer = new MutationObserver(() => {
      if (document.querySelector('.detail-drawer.open:not(.place-feed-drawer)')) setSelected(null)
    })
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [selected])

  const chooseMode = (nextMode) => {
    if (enabled && mode === nextMode) {
      setEnabled(false)
      return
    }
    setMode(nextMode)
    setEnabled(true)
  }

  const counts = useMemo(() => ({
    all: FEEDS.length,
    wildlife: feedsForMode('wildlife').length,
    aviation: feedsForMode('aviation').length,
  }), [])

  return (
    <>
      {chipHost && createPortal(
        <>
          {Object.keys(MODE).map((key) => (
            <button key={key} type="button" className={`place-feed-chip place-mode-${key} ${enabled && mode === key ? 'active' : ''}`} aria-pressed={enabled && mode === key} onClick={() => chooseMode(key)}>
              {MODE[key].label} <strong>{enabled && mode === key ? visible.length : counts[key]}</strong>
            </button>
          ))}
        </>,
        chipHost,
      )}
      {panelHost && enabled && createPortal(<PlacePanel map={map} onSelect={setSelected} feeds={modeFeeds} mode={mode} />, panelHost)}
      {drawerHost && selected && createPortal(<PlaceDrawer feed={selected} onClose={() => setSelected(null)} />, drawerHost)}
    </>
  )
}
