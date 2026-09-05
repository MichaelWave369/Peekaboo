export const SNAPSHOT_SCHEMA_VERSION = '1'
export const CHANGE_REPORT_SCHEMA_VERSION = '1'
const STORAGE_PREFIX = 'peekaboo:baseline:v1:'
const MAX_SNAPSHOT_RECORDS = 10000

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    )
  }
  return value
}

export function stableStringify(value) {
  return JSON.stringify(stableValue(value))
}

export function comparisonFingerprint(value) {
  const text = typeof value === 'string' ? value : stableStringify(value)
  const bytes = new TextEncoder().encode(text)
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  const mask = 0xffffffffffffffffn
  for (const byte of bytes) {
    hash ^= BigInt(byte)
    hash = (hash * prime) & mask
  }
  return hash.toString(16).padStart(16, '0')
}

function clean(value) {
  return value === undefined ? null : value
}

function semanticPayload(item, tagsFingerprint) {
  return {
    id: item.id,
    osmType: item.osmType,
    osmId: item.osmId,
    lat: item.lat,
    lon: item.lon,
    category: clean(item.category),
    name: clean(item.name),
    zone: clean(item.zone),
    operator: clean(item.operator),
    manufacturer: clean(item.manufacturer),
    manufacturerWikidata: clean(item.manufacturerWikidata),
    model: clean(item.model),
    modelWikidata: clean(item.modelWikidata),
    vendorStrength: clean(item.vendorEvidence?.strength),
    vendorBasis: clean(item.vendorEvidence?.basis),
    cameraType: clean(item.cameraType),
    direction: clean(item.direction),
    indoor: clean(item.indoor),
    tagsFingerprint,
  }
}

export function compactSnapshotRecord(item) {
  const tagsFingerprint = comparisonFingerprint(item.tags || {})
  const semantic = semanticPayload(item, tagsFingerprint)
  return {
    ...semantic,
    semanticFingerprint: comparisonFingerprint(semantic),
    version: clean(item.version),
    timestamp: clean(item.timestamp),
    changeset: clean(item.changeset),
  }
}

function snapshotDigestPayload(snapshot) {
  return {
    scopeFingerprint: snapshot.scopeFingerprint,
    records: snapshot.records.map((record) => [record.id, record.semanticFingerprint]),
  }
}

export function createSnapshot(items = [], meta = {}) {
  const records = items.map(compactSnapshotRecord).sort((a, b) => String(a.id).localeCompare(String(b.id)))
  const snapshot = {
    generator: 'Peekaboo',
    snapshotSchemaVersion: SNAPSHOT_SCHEMA_VERSION,
    appVersion: '0.6',
    capturedAt: meta.capturedAt || new Date().toISOString(),
    scopeFingerprint: meta.fingerprint || null,
    loadedAreaKm2: meta.loadedAreaKm2 ?? null,
    source: 'OpenStreetMap via Overpass',
    query: {
      endpoint: meta.endpoint || null,
      fetchedAt: meta.fetchedAt || null,
      cached: Boolean(meta.cached),
      attempts: meta.attempts ?? null,
      failures: meta.failures || [],
      durationMs: meta.durationMs ?? null,
    },
    recordCount: records.length,
    records,
  }
  snapshot.snapshotFingerprint = comparisonFingerprint(snapshotDigestPayload(snapshot))
  return snapshot
}

function validCoordinate(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

export function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return { ok: false, error: 'Snapshot must be a JSON object.' }
  if (snapshot.generator !== 'Peekaboo') return { ok: false, error: 'Snapshot generator is not Peekaboo.' }
  if (snapshot.snapshotSchemaVersion !== SNAPSHOT_SCHEMA_VERSION) return { ok: false, error: `Unsupported snapshot schema: ${snapshot.snapshotSchemaVersion || 'missing'}.` }
  if (typeof snapshot.scopeFingerprint !== 'string' || !snapshot.scopeFingerprint) return { ok: false, error: 'Snapshot is missing its viewport fingerprint.' }
  if (!Array.isArray(snapshot.records)) return { ok: false, error: 'Snapshot records are missing.' }
  if (snapshot.records.length > MAX_SNAPSHOT_RECORDS) return { ok: false, error: `Snapshot exceeds the ${MAX_SNAPSHOT_RECORDS.toLocaleString()} record safety limit.` }
  if (snapshot.recordCount !== snapshot.records.length) return { ok: false, error: 'Snapshot record count does not match its records array.' }

  const seen = new Set()
  for (const record of snapshot.records) {
    if (!record || typeof record !== 'object' || typeof record.id !== 'string' || !record.id) return { ok: false, error: 'Snapshot contains a record without a valid ID.' }
    if (seen.has(record.id)) return { ok: false, error: `Snapshot contains duplicate record ID ${record.id}.` }
    seen.add(record.id)
    if (!validCoordinate(record.lat, -90, 90) || !validCoordinate(record.lon, -180, 180)) return { ok: false, error: `Snapshot record ${record.id} has invalid coordinates.` }
    if (typeof record.tagsFingerprint !== 'string' || typeof record.semanticFingerprint !== 'string') return { ok: false, error: `Snapshot record ${record.id} is missing comparison fingerprints.` }
    const payload = semanticPayload(record, record.tagsFingerprint)
    if (comparisonFingerprint(payload) !== record.semanticFingerprint) return { ok: false, error: `Snapshot record ${record.id} failed its semantic fingerprint check.` }
  }

  const expectedSnapshotFingerprint = comparisonFingerprint(snapshotDigestPayload(snapshot))
  if (snapshot.snapshotFingerprint !== expectedSnapshotFingerprint) return { ok: false, error: 'Snapshot fingerprint check failed.' }
  return { ok: true, snapshot }
}

const FIELD_LABELS = [
  ['lat', 'location'],
  ['lon', 'location'],
  ['category', 'classification'],
  ['name', 'name'],
  ['zone', 'observed zone'],
  ['operator', 'operator'],
  ['manufacturer', 'manufacturer'],
  ['manufacturerWikidata', 'manufacturer Wikidata'],
  ['model', 'model'],
  ['modelWikidata', 'model Wikidata'],
  ['vendorStrength', 'vendor evidence strength'],
  ['vendorBasis', 'vendor evidence basis'],
  ['cameraType', 'camera type'],
  ['direction', 'direction'],
  ['indoor', 'indoor tag'],
  ['tagsFingerprint', 'raw OSM tags'],
]

export function changedFields(before, after) {
  const fields = []
  for (const [key, label] of FIELD_LABELS) {
    if (before[key] !== after[key] && !fields.includes(label)) fields.push(label)
  }
  return fields
}

export function compareSnapshots(baseline, current) {
  const baselineCheck = validateSnapshot(baseline)
  if (!baselineCheck.ok) return { compatible: false, reason: `Baseline invalid: ${baselineCheck.error}` }
  const currentCheck = validateSnapshot(current)
  if (!currentCheck.ok) return { compatible: false, reason: `Current snapshot invalid: ${currentCheck.error}` }
  if (baseline.scopeFingerprint !== current.scopeFingerprint) {
    return {
      compatible: false,
      reason: 'Viewport fingerprints differ. Peekaboo will not infer changes across different query areas.',
      baselineFingerprint: baseline.scopeFingerprint,
      currentFingerprint: current.scopeFingerprint,
    }
  }

  const beforeMap = new Map(baseline.records.map((record) => [record.id, record]))
  const afterMap = new Map(current.records.map((record) => [record.id, record]))
  const added = []
  const removed = []
  const changed = []
  const unchanged = []
  const statusById = new Map()

  for (const [id, after] of afterMap) {
    const before = beforeMap.get(id)
    if (!before) {
      added.push(after)
      statusById.set(id, { status: 'added', label: 'NEW OSM RECORD', fields: [] })
      continue
    }
    if (before.semanticFingerprint !== after.semanticFingerprint) {
      const fields = changedFields(before, after)
      changed.push({ id, fields, before, after })
      statusById.set(id, { status: 'changed', label: 'OSM METADATA CHANGED', fields })
    } else {
      unchanged.push(id)
      statusById.set(id, { status: 'unchanged', label: 'UNCHANGED FROM BASELINE', fields: [] })
    }
  }

  for (const [id, before] of beforeMap) {
    if (!afterMap.has(id)) removed.push(before)
  }

  added.sort((a, b) => a.id.localeCompare(b.id))
  removed.sort((a, b) => a.id.localeCompare(b.id))
  changed.sort((a, b) => a.id.localeCompare(b.id))
  unchanged.sort()

  return {
    compatible: true,
    scopeFingerprint: current.scopeFingerprint,
    baselineCapturedAt: baseline.capturedAt,
    currentCapturedAt: current.capturedAt,
    baselineSnapshotFingerprint: baseline.snapshotFingerprint,
    currentSnapshotFingerprint: current.snapshotFingerprint,
    summary: {
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      unchanged: unchanged.length,
      totalDelta: added.length + removed.length + changed.length,
    },
    added,
    removed,
    changed,
    unchanged,
    statusById,
  }
}

export function buildChangeReport(baseline, current, comparison = compareSnapshots(baseline, current)) {
  if (!comparison.compatible) {
    return {
      generator: 'Peekaboo',
      changeReportSchemaVersion: CHANGE_REPORT_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      compatible: false,
      reason: comparison.reason,
    }
  }

  return {
    generator: 'Peekaboo',
    changeReportSchemaVersion: CHANGE_REPORT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    compatible: true,
    source: 'OpenStreetMap via Overpass',
    scopeFingerprint: comparison.scopeFingerprint,
    disclaimer: 'This report compares public OpenStreetMap records. Added, removed, or changed records do not independently prove that physical surveillance devices were installed, removed, moved, active, or inactive.',
    baseline: {
      capturedAt: baseline.capturedAt,
      snapshotFingerprint: baseline.snapshotFingerprint,
      recordCount: baseline.recordCount,
      query: baseline.query,
    },
    current: {
      capturedAt: current.capturedAt,
      snapshotFingerprint: current.snapshotFingerprint,
      recordCount: current.recordCount,
      query: current.query,
    },
    summary: comparison.summary,
    changes: {
      added: comparison.added,
      removed: comparison.removed,
      changed: comparison.changed,
    },
  }
}

export function baselineStorageKey(scopeFingerprint) {
  return `${STORAGE_PREFIX}${scopeFingerprint}`
}

export function saveBaseline(storage, snapshot) {
  const check = validateSnapshot(snapshot)
  if (!check.ok) return { ok: false, error: check.error }
  if (!storage?.setItem) return { ok: false, error: 'Browser storage is unavailable.' }
  try {
    const key = baselineStorageKey(snapshot.scopeFingerprint)
    storage.setItem(key, JSON.stringify(snapshot))
    return { ok: true, key }
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not save the baseline in browser storage.' }
  }
}

export function loadBaseline(storage, scopeFingerprint) {
  if (!storage?.getItem || !scopeFingerprint) return { ok: false, error: 'Browser storage or viewport fingerprint is unavailable.' }
  try {
    const raw = storage.getItem(baselineStorageKey(scopeFingerprint))
    if (!raw) return { ok: true, snapshot: null }
    const parsed = JSON.parse(raw)
    const check = validateSnapshot(parsed)
    if (!check.ok) return { ok: false, error: check.error }
    return { ok: true, snapshot: parsed }
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not read the saved baseline.' }
  }
}

export function removeBaseline(storage, scopeFingerprint) {
  if (!storage?.removeItem || !scopeFingerprint) return { ok: false, error: 'Browser storage or viewport fingerprint is unavailable.' }
  try {
    storage.removeItem(baselineStorageKey(scopeFingerprint))
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not remove the saved baseline.' }
  }
}
