import { boundsFingerprint, fetchSurveillance } from './data.js'
import {
  boundsAdapter,
  combineCompleteShardResults,
  isShardableOverpassFailure,
  splitBoundsIntoQuadrants,
} from './sharding.js'

function abortError() {
  return new DOMException('Aborted', 'AbortError')
}

function delay(ms, signal) {
  if (!ms) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(abortError())
    }
    if (signal?.aborted) onAbort()
    else signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export async function fetchSurveillanceAdaptive(bounds, signal, options = {}) {
  const force = Boolean(options.force)
  const fetcher = options.fetcher || fetchSurveillance
  const shardDelayMs = options.shardDelayMs ?? 650

  try {
    const result = await fetcher(bounds, signal, { force })
    return {
      ...result,
      scanMode: 'single',
      shardCount: 1,
      shardDetails: [],
      fallbackReason: null,
    }
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    const reason = error?.message || 'Unknown Overpass failure.'
    if (!isShardableOverpassFailure(reason)) throw error

    const shards = splitBoundsIntoQuadrants(bounds)
    const completed = []
    let attemptTotal = 2 // A failed full fetch exhausts the two configured Overpass endpoints.

    for (let index = 0; index < shards.length; index += 1) {
      if (signal?.aborted) throw abortError()
      if (index > 0) await delay(shardDelayMs, signal)
      const shard = shards[index]
      try {
        const result = await fetcher(boundsAdapter(shard), signal, { force })
        attemptTotal += Number(result.attempts || 0)
        completed.push({
          id: shard.id,
          complete: true,
          items: result.items,
          endpoint: result.endpoint,
          cached: Boolean(result.cached),
          fetchedAt: result.fetchedAt,
          attempts: result.attempts || 0,
          failures: result.failures || [],
        })
      } catch (shardError) {
        if (shardError?.name === 'AbortError') throw shardError
        throw new Error(`Adaptive scan aborted: shard ${shard.id} failed. No partial results were accepted. ${shardError?.message || shardError}`)
      }
    }

    const items = combineCompleteShardResults(completed)
    const endpoints = [...new Set(completed.map((entry) => entry.endpoint).filter(Boolean))]
    const fetchedAt = Math.max(...completed.map((entry) => Number(entry.fetchedAt) || 0), Date.now())
    const shardFailures = completed.flatMap((entry) => entry.failures.map((failure) => `${entry.id}: ${failure}`))

    return {
      items,
      endpoint: endpoints.length === 1 ? endpoints[0] : `${endpoints.length} Overpass endpoints`,
      cached: completed.every((entry) => entry.cached),
      fetchedAt,
      fingerprint: boundsFingerprint(bounds),
      attempts: attemptTotal,
      failures: [`FULL VIEW: ${reason}`, ...shardFailures],
      scanMode: 'sharded',
      shardCount: completed.length,
      shardDetails: completed.map(({ id, endpoint, cached, attempts }) => ({ id, endpoint, cached, attempts })),
      fallbackReason: reason,
    }
  }
}
