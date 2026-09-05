import { useEffect, useRef, useState } from 'react'
import { searchPlaces } from './geocoder.js'

export default function AddressSearch({ onNavigate, disabled = false }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const abortRef = useRef(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const submit = async (event) => {
    event.preventDefault()
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setStatus('')

    try {
      const response = await searchPlaces(query, controller.signal)
      setResults(response.results)
      setStatus(response.results.length
        ? `${response.results.length} result${response.results.length === 1 ? '' : 's'}${response.cached ? ' • cached' : ''}`
        : 'No matching place found.')
    } catch (error) {
      if (error.name !== 'AbortError') {
        setResults([])
        setStatus(error.message || 'Place search failed.')
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  const choose = (place) => {
    onNavigate(place)
    setStatus(`Map moved to ${place.label}`)
    setResults([])
  }

  return (
    <section className="panel address-search-panel">
      <div className="panel-heading"><span>ADDRESS / PLACE SEARCH</span><span>NAVIGATION ONLY</span></div>
      <form className="address-search-form" onSubmit={submit}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="address, city, landmark…"
          autoComplete="off"
          spellCheck="false"
          aria-label="Search for an address or place"
          disabled={disabled || loading}
        />
        <button type="submit" disabled={disabled || loading || query.trim().length < 2}>
          {loading ? 'SEARCHING…' : 'FIND'}
        </button>
      </form>
      {status && <div className="address-search-status" aria-live="polite">{status}</div>}
      {results.length > 0 && (
        <div className="address-results" role="list">
          {results.map((place) => (
            <button key={place.id} type="button" className="address-result" onClick={() => choose(place)} role="listitem">
              <strong>{place.label}</strong>
              <span>{place.type}</span>
            </button>
          ))}
        </div>
      )}
      <p className="microcopy">
        Search is user-triggered and only moves the map. It does not scan surveillance data automatically. Place search © OpenStreetMap contributors via Nominatim.
      </p>
    </section>
  )
}
