import { API_URL } from './config'

let memToken = null

export const setToken = (token) => {
  memToken = token
  if (token) localStorage.setItem('token', token)
  else localStorage.removeItem('token')
}

export const loadToken = () => {
  memToken = localStorage.getItem('token')
  return memToken
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {}
  if (memToken) headers.Authorization = `Bearer ${memToken}`

  let payload
  if (body) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: payload })
  } catch (e) {
    throw new Error(`Serverga ulanib bo'lmadi. Internetni tekshiring.`)
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${data.message || 'Xatolik yuz berdi'} [${res.status}]`)
  return data
}

export const api = {
  get:   (path)       => request(path),
  post:  (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del:   (path)       => request(path, { method: 'DELETE' }),
}
