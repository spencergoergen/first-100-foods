import { useEffect, useState } from 'react'

const KEY = 'first-100-foods:v1'

const EMPTY = { babyName: '', customFoods: [], tries: [] }

function clean(data) {
  return {
    babyName: typeof data.babyName === 'string' ? data.babyName : '',
    customFoods: Array.isArray(data.customFoods) ? data.customFoods.filter((f) => f && f.id && f.name) : [],
    tries: Array.isArray(data.tries) ? data.tries.filter((t) => t && t.id && t.foodId && t.date) : [],
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? clean(JSON.parse(raw)) : EMPTY
  } catch {
    return EMPTY
  }
}

export function useStore() {
  const [state, setState] = useState(load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // storage full or blocked; keep working in memory
    }
  }, [state])
  return [state, setState]
}

export function normalizeImport(data) {
  if (!data || !Array.isArray(data.tries)) throw new Error('Not a First 100 Foods backup file')
  return clean(data)
}

export const EMPTY_STATE = EMPTY

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

export function today() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const dayLabel = (date) =>
  new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

// Newest first; same-day entries by creation time
export const byNewest = (a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0)

export function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
