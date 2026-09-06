import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import PublicCamViewer from './PublicCamViewer.jsx'
import { RELEASE_LABEL, RELEASE_SHORT } from './release.js'

function contextRow(label) {
  return [...document.querySelectorAll('.context-filter-row')]
    .find((row) => row.textContent?.toLowerCase().includes(label.toLowerCase())) || null
}

function categoryRows() {
  return [...document.querySelectorAll('.filter-list > .filter-row')]
}

function readRowState(label) {
  const row = contextRow(label)
  const input = row?.querySelector('input[type="checkbox"]')
  const count = Number(row?.querySelector('strong')?.textContent || 0)
  return { checked: Boolean(input?.checked), count: Number.isFinite(count) ? count : 0 }
}

function setChecked(input, wanted) {
  if (input && Boolean(input.checked) !== wanted) input.click()
}

function viewIsDirty() {
  return Boolean(
    document.querySelector('.map-hud')?.textContent?.includes('VIEW MOVED') ||
    [...document.querySelectorAll('.notice-box')].some((node) => node.textContent?.includes('Map moved after the last scan')),
  )
}

function activateContextPreset(label) {
  const target = contextRow(label)
  const targetInput = target?.querySelector('input[type="checkbox"]')
  if (!targetInput) return

  const turningOff = Boolean(targetInput.checked)
  categoryRows().forEach((row) => setChecked(row.querySelector('input[type="checkbox"]'), true))

  ;[...document.querySelectorAll('.context-filter-row')].forEach((row) => {
    const input = row.querySelector('input[type="checkbox"]')
    setChecked(input, false)
  })

  if (!turningOff) setChecked(targetInput, true)
}

function requestCurrentMapScan() {
  const button = document.querySelector('.load-button')
  if (button && !button.disabled) button.click()
}

function setTextIfChanged(node, value) {
  if (node && node.textContent !== value) node.textContent = value
}

function stampRelease() {
  const footer = document.querySelector('footer')
  if (footer) {
    const spans = footer.querySelectorAll('span')
    setTextIfChanged(spans[0], RELEASE_LABEL)
    setTextIfChanged(spans[1], 'PUBLIC LINKS + OFFICIAL SOURCES • NO DEVICE DISCOVERY • NO STREAM PROBING')
  }

  const release = document.querySelector('.release-panel')
  const version = release?.querySelector('.panel-heading span:last-child')
  setTextIfChanged(version, RELEASE_SHORT)
  const list = release?.querySelector('ul')
  if (list && !list.querySelector('[data-v15-iowa-dot]')) {
    const item = document.createElement('li')
    item.dataset.v15IowaDot = 'true'
    item.textContent = 'Iowa DOT / Iowa 511 is now a separate official-source layer using the state’s credential-free camera FeatureServer, with viewport binding, image/video evidence and shared ArcGIS fail-closed query semantics.'
    list.prepend(item)
  }
  if (list && !list.querySelector('[data-v14-caltrans]')) {
    const item = document.createElement('li')
    item.dataset.v14Caltrans = 'true'
    item.textContent = 'Caltrans CCTV is a separate official-source layer with viewport-bound queries, snapshot/video evidence, service status, and fail-closed transfer-limit handling.'
    list.appendChild(item)
  }
  if (list && !list.querySelector('[data-v13-official-sources]')) {
    const item = document.createElement('li')
    item.dataset.v13OfficialSources = 'true'
    item.textContent = 'Official public-camera sources sit beside OSM, beginning with USGS Ashcam current-image cameras and explicit source/freshness receipts.'
    list.appendChild(item)
  }
}

function readQuickState() {
  return {
    live: readRowState('Public live cam'),
    weather: readRowState('Weather / conditions cam'),
    dirty: viewIsDirty(),
  }
}

function QuickCamFilters() {
  const [state, setState] = useState(readQuickState)

  useEffect(() => {
    const sync = () => setState((current) => {
      const next = readQuickState()
      if (
        current.live.checked === next.live.checked &&
        current.live.count === next.live.count &&
        current.weather.checked === next.weather.checked &&
        current.weather.count === next.weather.count &&
        current.dirty === next.dirty
      ) return current
      return next
    })
    sync()
    const timer = setInterval(sync, 350)
    return () => clearInterval(timer)
  }, [])

  const clickPreset = (label) => {
    activateContextPreset(label)
    setTimeout(() => setState(readQuickState()), 0)
  }

  return (
    <>
      <button
        type="button"
        className={`${state.live.checked ? 'active ' : ''}${state.dirty ? 'stale ' : ''}live-cam-chip`.trim()}
        aria-pressed={state.live.checked}
        title={state.dirty ? 'Counts belong to the previous scanned viewport. Rescan the current map.' : 'Show only OSM records with an explicit public webcam URL.'}
        onClick={() => clickPreset('Public live cam')}
      >
        OSM LIVE <strong>{state.dirty ? 'RESCAN' : state.live.count}</strong>
      </button>
      <button
        type="button"
        className={`${state.weather.checked ? 'active ' : ''}${state.dirty ? 'stale ' : ''}weather-cam-chip`.trim()}
        aria-pressed={state.weather.checked}
        title={state.dirty ? 'Counts belong to the previous scanned viewport. Rescan the current map.' : 'Show only OSM public webcams described as weather / conditions feeds.'}
        onClick={() => clickPreset('Weather / conditions cam')}
      >
        WEATHER <strong>{state.dirty ? 'RESCAN' : state.weather.count}</strong>
      </button>
    </>
  )
}

function CamRescanNotice() {
  const [state, setState] = useState(readQuickState)

  useEffect(() => {
    const timer = setInterval(() => setState(readQuickState()), 350)
    return () => clearInterval(timer)
  }, [])

  if (!state.dirty || (!state.live.checked && !state.weather.checked)) return null

  return (
    <div className="cam-rescan-notice" role="status">
      <strong>OSM LIVE-CAM RESULTS ARE FROM THE PREVIOUS SCAN</strong>
      <span>Rescan this viewport before using those counts as current-area results.</span>
      <button type="button" onClick={requestCurrentMapScan}>RESCAN CURRENT MAP</button>
    </div>
  )
}

export default function PublicCamEnhancer() {
  const [chipHost, setChipHost] = useState(null)
  const [noticeHost, setNoticeHost] = useState(null)
  const [viewerHost, setViewerHost] = useState(null)
  const [tags, setTags] = useState(null)
  const rawTextRef = useRef('')

  useEffect(() => {
    let chip = null
    let notice = null
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

      const contextBlock = document.querySelector('.context-filter-block')
      if (contextBlock) {
        notice = document.getElementById('peekaboo-cam-rescan-notice-host')
        if (!notice) {
          notice = document.createElement('div')
          notice.id = 'peekaboo-cam-rescan-notice-host'
          contextBlock.appendChild(notice)
        }
        setNoticeHost((current) => current === notice ? current : notice)
      }

      const drawer = document.querySelector('.detail-drawer.open:not(.official-feed-drawer):not(.caltrans-feed-drawer):not(.iowa-feed-drawer)')
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
      if (notice?.isConnected) notice.remove()
      if (viewer?.isConnected) viewer.remove()
    }
  }, [])

  const viewer = useMemo(() => (viewerHost && tags ? createPortal(<PublicCamViewer tags={tags} />, viewerHost) : null), [viewerHost, tags])

  return (
    <>
      {chipHost && createPortal(<QuickCamFilters />, chipHost)}
      {noticeHost && createPortal(<CamRescanNotice />, noticeHost)}
      {viewer}
    </>
  )
}
