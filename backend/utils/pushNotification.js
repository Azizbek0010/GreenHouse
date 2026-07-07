exports.sendPush = async (expoPushToken, title, body) => {
  if (!expoPushToken) return
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: expoPushToken, title, body, sound: 'default' }),
    })
  } catch (err) {
    console.error('Push notification xatosi:', err.message)
  }
}
