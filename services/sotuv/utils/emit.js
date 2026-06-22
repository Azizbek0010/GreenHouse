const NOTIFY = process.env.NOTIFY_URL || 'http://notify:3006'

module.exports = async function emit(room, event, data) {
  try {
    await fetch(`${NOTIFY}/emit`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ room, event, data }),
    })
  } catch (e) {
    console.error('notify emit error:', e.message)
  }
}
