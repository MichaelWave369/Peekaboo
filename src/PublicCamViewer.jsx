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
  const [mediaError, setMediaError] = useState(false)
  const videoRef = useRef(null)

  useEffect(() => {
    setLoaded(false)
    setFrameToken(0)
    setMediaError(false)
  }, [evidence?.url])

  if (!evidence) return null

  const directUrl = evidence.mediaKind === 'image' ? cacheBusted(evidence.url, frameToken) : evidence.url
  const externalOnly = !evidence.inlineEligible || evidence.mediaKind === 'page'
  const hasProviderFallback = Boolean(evidence.providerFallback)
  const badge = hasProviderFallback ? 'OFFICIAL DIRECTORY' : 'PUBLISHED LINK'
  const primaryUrl = evidence.recommendedUrl || evidence.url
  const primaryLabel = hasProviderFallback
    ? evidence.providerFallback.label
    : 'OPEN OSM-PUBLISHED LINK'

  return (
    <section className="public-cam-card">
      <div className="public-cam-heading">
        <div>
          <strong>PUBLIC WEBCAM / OSM</strong>
          <span>{kind?.label || 'Public webcam'}</span>
        </div>
        <span className={`public-cam-live-dot ${hasProviderFallback ? 'fallback' : ''}`}>{badge}</span>
      </div>

      <div className="public-cam-receipt">
        <span>{evidence.hostname}</span>
        <code>contact:webcam</code>
        <span>reachability not verified by OSM</span>
      </div>

      {hasProviderFallback && (
        <div className="public-cam-stale-note">
          <strong>STALE / LEGACY PROVIDER ROUTE</strong>
          <span>{evidence.providerFallback.providerName}</span>
          <p>{evidence.providerFallback.reason}</p>
          <p>Peekaboo keeps the original OSM URL as provenance but uses the provider's current official camera directory as the primary action.</p>
        </div>
      )}

      {!loaded && !externalOnly && !hasProviderFallback && (
        <button type="button" className="public-cam-load" onClick={() => { setMediaError(false); setLoaded(true) }}>
          LOAD PUBLISHED MEDIA
        </button>
      )}

      {loaded && !mediaError && evidence.mediaKind === 'image' && (
        <div className="public-cam-media">
          <img
            src={directUrl}
            alt={tags.name || 'Public webcam view'}
            loading="lazy"
            onError={() => setMediaError(true)}
          />
          <button type="button" onClick={() => { setMediaError(false); setFrameToken(Date.now()) }}>REFRESH FRAME</button>
        </div>
      )}

      {loaded && !mediaError && ['video', 'hls'].includes(evidence.mediaKind) && (
        <div className="public-cam-media">
          <video
            ref={videoRef}
            src={directUrl}
            controls
            playsInline
            preload="metadata"
            onError={() => setMediaError(true)}
          />
          {evidence.mediaKind === 'hls' && (
            <small>HLS playback depends on browser support. If it does not play here, use the published/provider link below.</small>
          )}
        </div>
      )}

      {mediaError && (
        <div className="public-cam-load-error" role="alert">
          <strong>PUBLISHED MEDIA COULD NOT BE LOADED</strong>
          <span>The link may be stale, blocked by the provider, or incompatible with this browser. Peekaboo does not probe for alternate stream paths.</span>
        </div>
      )}

      <a className="public-cam-open" href={primaryUrl} target="_blank" rel="noopener noreferrer">
        {primaryLabel} ↗
      </a>

      {hasProviderFallback && (
        <details className="public-cam-original-link">
          <summary>Original OSM-published URL</summary>
          <code>{evidence.url}</code>
          <p>This original mapping claim may now redirect to an error page. It is retained here for provenance.</p>
        </details>
      )}

      <p>
        OpenStreetMap explicitly publishes a <code>contact:webcam</code> URL for this record, but that does not prove the URL is still reachable.
        Peekaboo does not probe cameras, guess stream addresses, bypass authentication, or discover exposed devices.
      </p>
    </section>
  )
}
