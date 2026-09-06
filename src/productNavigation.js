export const PRODUCT_MODES = Object.freeze(['surveillance', 'public'])

export function normalizeProductMode(value) {
  return PRODUCT_MODES.includes(value) ? value : 'surveillance'
}

export function normalizeRecordId(value) {
  const text = String(value || '').trim()
  if (!text || text.length > 160) return ''
  return /^[A-Za-z0-9_./:-]+$/.test(text) ? text : ''
}

export function buildProductHash({ view, filters = {}, contexts = {}, search = '', mode = 'surveillance', recordId = '' } = {}) {
  const params = new URLSearchParams()
  if (view && Number.isFinite(view.zoom) && Number.isFinite(view.lat) && Number.isFinite(view.lon)) {
    params.set('map', `${view.zoom}/${Number(view.lat).toFixed(5)}/${Number(view.lon).toFixed(5)}`)
  }
  params.set('layers', Object.entries(filters).filter(([, enabled]) => enabled).map(([key]) => key).join(','))
  const activeContexts = Object.entries(contexts).filter(([, enabled]) => enabled).map(([key]) => key).join(',')
  if (activeContexts) params.set('contexts', activeContexts)
  const q = String(search || '').trim()
  if (q) params.set('q', q)
  const normalizedMode = normalizeProductMode(mode)
  if (normalizedMode !== 'surveillance') params.set('mode', normalizedMode)
  const normalizedRecord = normalizeRecordId(recordId)
  if (normalizedRecord) params.set('record', normalizedRecord)
  return params.toString()
}

export function parseProductHash(hash = '') {
  try {
    const params = new URLSearchParams(String(hash).replace(/^#/, ''))
    return {
      mode: normalizeProductMode(params.get('mode')),
      recordId: normalizeRecordId(params.get('record')),
    }
  } catch {
    return { mode: 'surveillance', recordId: '' }
  }
}

export function sortRecordSummaries(items = []) {
  return [...items].sort((a, b) => {
    const category = String(a.category || '').localeCompare(String(b.category || ''))
    if (category) return category
    const name = String(a.name || '').localeCompare(String(b.name || ''))
    if (name) return name
    return String(a.id || '').localeCompare(String(b.id || ''))
  })
}
