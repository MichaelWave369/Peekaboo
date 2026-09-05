import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import PublicCamViewer from './PublicCamViewer.jsx'

function contextRow(label) {
  return [...document.querySelectorAll('.context-filter-row')]
    .find((row) => row.textContent?.toLowerCase().includes(label.toLowerCase())) || null
}

function readRowState(label) {
  const row = contextRow(label)
  const input = row?.querySelector('input[type="checkbox"]')
  const count = Number(row?.querySelector('strong')?.textContent || 0)
  return { checked: Boolean(input?.checked), count: Number.isFinite(count) ? count : 0 }
}

function toggleRow(label) {
  contextRow(label)?.querySelector('input[type="checkbox"]')?.click()
}

function stampRelease() {
  const footer = document.querySelector('footer')
  if (footer) {
    const spans = footer.querySelectorAll('span')
    if (spans[0]) spans[0].textContent = 'PEEKABOO v1.2'
    if (spans[1]) spans[1].textContent = 'PUBLIC FEEDS ONLY • NO DEVICE DISCOVERY • NO STREAM PROBING'
  }

  const release = document.querySelector('.release-panel')
  const version = release?.querySelector('.panel-heading span:last-child')
  if (version) version.textContent = 'v1.2'
  const list = release?.querySelector('ul')
  if (list && !list.querySelector('[data-v12-live-cams]')) {
    const item = document.createElement('li')
    item.dataset.v12LiveCams = 'true'
    item.textContent = 'Public webcam viewing from explicit OSM contact:webcam links, with safe inline media and external-page fallback.'
    list.prepend(item)
  }
}

function QuickCamFilters() {
  const [state, setState] = useState(() => ({
    live: readRowState('Public live cam'),
    weather: readRowState('Weather / conditions cam'),
  }))

  useEffect(() => {
    const sync = () => setState({
      live: readRowState('Public live cam'),
      weather: readRowState('Weather / conditions cam'),
    })
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.querySelector('.sidebar') || document.body, { childList: true, subtree: true, attributes: true })
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <button
        type="button"
        className={state.live.checked ? 'active live-cam-chip' : 'live-cam-chip'}
        aria-pressed={state.live.checked}
        onClick={() => toggleRow('Public live cam')}
      >
        LIVE CAMS <strong>{state.live.count}</strong>
      </button>
      <button
        type="button"
        className={state.weather.checked ? 'active weather-cam-chip' : 'weather-cam-chip'}
        aria-pressed={state.weather.checked}
        onClick={() => toggleRow('Weather / conditions cam')}
      >
        WEATHER <strong>{state.weather.count}</strong>
      </button>
    </>
  )
}

export default function PublicCamEnhancer() {
  const [chipHost, setChipHost] = useState(null)
  const [viewerHost, setViewerHost] = useState(null)
  const [tags, setTags] = useState(null)

  useEffect(() => {
    let chip = null
    let viewer = null

    const attach = () => {
      stampRelease()

      const chips = document.querySelector('.map-filter-chips')
      if (chips) {
        chip = document.getElementById('peekaboo-live-cam-chip-host')
        if (!chip) {
          chip = document.createElement('span')
          chip.id = 'peekaboo-live-cam-chip-host'
          chip.className = 'public-cam-chip-host'
          chips.appendChild(chip)
        }
        setChipHost(chip)
      }

      const drawer = document.querySelector('.detail-drawer.open')
      const raw = drawer?.querySelector('.raw-tags pre')
      if (!drawer || !raw) {
        setViewerHost(null)
        setTags(null)
        return
      }

      let parsed = null
      try { parsed = JSON.parse(raw.textContent || '{}') } catch { parsed = null }
      setTags(parsed)

      viewer = drawer.querySelector('#peekaboo-public-cam-viewer-host')
      if (!viewer) {
        viewer = document.createElement('div')
        viewer.id = 'peekaboo-public-cam-viewer-host'
        const before = drawer.querySelector('.metadata-note') || drawer.querySelector('.field-list')
        if (before) drawer.insertBefore(viewer, before)
        else drawer.appendChild(viewer)
      }
      setViewerHost(viewer)
    }

    attach()
    const observer = new MutationObserver(attach)
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true, attributes: true })

    return () => {
      observer.disconnect()
      if (chip?.isConnected) chip.remove()
      if (viewer?.isConnected) viewer.remove()
    }
  }, [])

  const viewer = useMemo(() => (viewerHost && tags ? createPortal(<PublicCamViewer tags={tags} />, viewerHost) : null), [viewerHost, tags])

  return (
    <>
      {chipHost && createPortal(<QuickCamFilters />, chipHost)}
      {viewer}
    </>
  )
}
