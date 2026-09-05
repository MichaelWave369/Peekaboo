import { useEffect, useMemo, useRef, useState } from 'react'
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

function setTextIfChanged(node, value) {
  if (node && node.textContent !== value) node.textContent = value
}

function stampRelease() {
  const footer = document.querySelector('footer')
  if (footer) {
    const spans = footer.querySelectorAll('span')
    setTextIfChanged(spans[0], 'PEEKABOO v1.2')
    setTextIfChanged(spans[1], 'PUBLIC FEEDS ONLY • NO DEVICE DISCOVERY • NO STREAM PROBING')
  }

  const release = document.querySelector('.release-panel')
  const version = release?.querySelector('.panel-heading span:last-child')
  setTextIfChanged(version, 'v1.2')
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
    const sync = () => setState((current) => {
      const next = {
        live: readRowState('Public live cam'),
        weather: readRowState('Weather / conditions cam'),
      }
      if (
        current.live.checked === next.live.checked &&
        current.live.count === next.live.count &&
        current.weather.checked === next.weather.checked &&
        current.weather.count === next.weather.count
      ) return current
      return next
    })
    sync()
    const timer = setInterval(sync, 500)
    return () => clearInterval(timer)
  }, [])

  return (
    <>
      <button
        type="button"
        className={state.live.checked ? 'active live-cam-chip' : 'live-cam-chip'}
        aria-pressed={state.live.checked}
        onClick={() => { toggleRow('Public live cam'); setTimeout(() => setState({ live: readRowState('Public live cam'), weather: readRowState('Weather / conditions cam') }), 0) }}
      >
        LIVE CAMS <strong>{state.live.count}</strong>
      </button>
      <button
        type="button"
        className={state.weather.checked ? 'active weather-cam-chip' : 'weather-cam-chip'}
        aria-pressed={state.weather.checked}
        onClick={() => { toggleRow('Weather / conditions cam'); setTimeout(() => setState({ live: readRowState('Public live cam'), weather: readRowState('Weather / conditions cam') }), 0) }}
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
  const rawTextRef = useRef('')

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
        setChipHost((current) => current === chip ? current : chip)
      }

      const drawer = document.querySelector('.detail-drawer.open')
      const raw = drawer?.querySelector('.raw-tags pre')
      if (!drawer || !raw) {
        rawTextRef.current = ''
        setViewerHost(null)
        setTags(null)
        return
      }

      const rawText = raw.textContent || '{}'
      if (rawText !== rawTextRef.current) {
        rawTextRef.current = rawText
        try { setTags(JSON.parse(rawText)) } catch { setTags(null) }
      }

      viewer = drawer.querySelector('#peekaboo-public-cam-viewer-host')
      if (!viewer) {
        viewer = document.createElement('div')
        viewer.id = 'peekaboo-public-cam-viewer-host'
        const before = drawer.querySelector('.metadata-note') || drawer.querySelector('.field-list')
        if (before) drawer.insertBefore(viewer, before)
        else drawer.appendChild(viewer)
      }
      setViewerHost((current) => current === viewer ? current : viewer)
    }

    attach()
    const observer = new MutationObserver(attach)
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })

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
