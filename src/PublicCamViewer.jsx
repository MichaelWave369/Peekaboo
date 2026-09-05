import { useEffect, useMemo, useRef, useState } from 'react'
import { publicCamEvidence, publicCamKind } from './publicCam.js'

function cacheBusted(url, token) {
  try {
    const next = new URL(url)
    next.searchParams.set('peekaboo_frame', String(token))
    return next.toString()
  } catch {
    return url
  }
}

export default function PublicCamViewer({ tags = {} }) {
  const evidence = useMemo(() => publicCamEvidence(tags), [tags])
  const kind = useMemo(() => publicCamKind(tags), [tags])
  const [loaded, setLoaded] = useState(false)
  const [frameToken, setFrameToken] = useState(0)
  const videoRef = useRef(null)

  useEffect(() => {
    setLoaded(false)
    setFrameToken(0)
  }, [evidence?.url])

  if (!evidence) return null

  const directUrl = evidence.mediaKind === 'image' ? cacheBusted(evidence.url, frameToken) : evidence.url
  const externalOnly = !evidence.inlineEligible || evidence.mediaKind === 'page'

  return (
    <section className="public-cam-card">
      <div className="public-cam-heading">
        <div>
          <strong>PUBLIC WEBCAM / OSM</strong>
          <span>{kind?.label || 'Public webcam'}</span>
        </div>
        <span className="public-cam-live-dot">PUBLIC FEED</span>
      </div>

      <div className="public-cam-receipt">
        <span>{evidence.hostname}</span>
        <code>contact:webcam</code>
      </div>

      {!loaded && !externalOnly && (
        <button type="button" className="public-cam-load" onClick={() => setLoaded(true)}>
          LOAD PUBLIC FEED
        </button>
      )}

      {loaded && evidence.mediaKind === 'image' && (
        <div className="public-cam-media">
          <img src={directUrl} alt={tags.name || 'Public webcam view'} loading="lazy" />
          <button type="button" onClick={() => setFrameToken(Date.now())}>REFRESH FRAME</button>
        </div>
      )}

      {loaded && ['video', 'hls'].includes(evidence.mediaKind) && (
        <div className="public-cam-media">
          <video ref={videoRef} src={directUrl} controls playsInline preload="metadata" />
          {evidence.mediaKind === 'hls' && (
            <small>HLS playback depends on browser support. If it does not play here, open the published feed directly.</small>
          )}
        </div>
      )}

      <a className="public-cam-open" href={evidence.url} target="_blank" rel="noopener noreferrer">
        OPEN PUBLISHED FEED ↗
      </a>

      <p>
        This link is displayed only because OpenStreetMap explicitly publishes a <code>contact:webcam</code> URL for this record.
        Peekaboo does not probe cameras, guess stream addresses, bypass authentication, or discover exposed devices.
      </p>
    </section>
  )
}
