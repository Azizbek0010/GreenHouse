// Gul turlari va razmerlar.
// Turlar bazadan (/api/flower-types) yuklanadi — admin qo'shgan tur hamma joyda ko'rinadi.
import { api } from './api'

export const FLOWER_SIZES = [40, 50, 60, 70, 80, 90, 100, 110]

// Server ishlamay qolsa fallback
export const DEFAULT_FLOWER_TYPES = ['Гладиатор', 'Пруд ок', 'Баблас', 'Бамбастик', 'Лондонай', 'Жумилия', 'Лидия', 'Лилия фиолетовый']

let cache = null

// Oxirgi ma'lum ro'yxat — modal ochilganda darhol ko'rsatish uchun
export function cachedFlowerTypes() {
  return cache || DEFAULT_FLOWER_TYPES
}

// Serverdan yangilab olish (har modal ochilishida chaqiriladi — admin qo'shgani darhol ko'rinadi)
export async function loadFlowerTypes() {
  try {
    const list = await api.get('/api/flower-types')
    cache = list.map(t => t.name)
  } catch {
    if (!cache) cache = DEFAULT_FLOWER_TYPES
  }
  return cache
}
