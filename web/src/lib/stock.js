// Ombor qoldig'i (/api/stock) — type+razmer kesimida
import { api } from './api'

// [{ type, razmer, received, sold, qarz, atxod, remaining }]
export async function loadStock() {
  return api.get('/api/stock')
}

// Qatorlarni tur bo'yicha guruhlash: Map<type, { total, sizes: [{ razmer, remaining }] }>
export function groupStock(rows) {
  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.type)) map.set(r.type, { total: 0, sizes: [] })
    const g = map.get(r.type)
    g.total += r.remaining
    g.sizes.push(r)
  }
  for (const g of map.values()) g.sizes.sort((a, b) => a.razmer - b.razmer)
  return map
}
