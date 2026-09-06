import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const DEFAULT_SNAPSHOT = Object.freeze({
  view: null,
  scan: { label: 'SCAN THIS VIEW', loading: false, dirty: false, canScan: false },
  ledgerDelta: null,
  mode: 'surveillance',
  selectedId: null,
  pendingRecordId: null,
  queryLoaded: false,
  viewDirty: false,
})

const ProductStateContext = createContext(null)

export function ProductStateProvider({ children }) {
  const [snapshot, setSnapshot] = useState(DEFAULT_SNAPSHOT)
  const actionsRef = useRef({})

  const publish = useCallback((patch) => {
    if (!patch || typeof patch !== 'object') return
    setSnapshot((current) => ({
      ...current,
      ...patch,
      scan: patch.scan ? { ...current.scan, ...patch.scan } : current.scan,
    }))
  }, [])

  const registerActions = useCallback((actions) => {
    if (!actions || typeof actions !== 'object') return () => {}
    const registered = { ...actions }
    actionsRef.current = { ...actionsRef.current, ...registered }
    return () => {
      const next = { ...actionsRef.current }
      Object.entries(registered).forEach(([key, fn]) => {
        if (next[key] === fn) delete next[key]
      })
      actionsRef.current = next
    }
  }, [])

  const invoke = useCallback((name, ...args) => {
    const action = actionsRef.current[name]
    return typeof action === 'function' ? action(...args) : undefined
  }, [])

  const value = useMemo(() => ({ snapshot, publish, registerActions, invoke }), [snapshot, publish, registerActions, invoke])
  return <ProductStateContext.Provider value={value}>{children}</ProductStateContext.Provider>
}

export function useProductState() {
  const value = useContext(ProductStateContext)
  if (!value) throw new Error('useProductState must be used inside ProductStateProvider')
  return value
}
