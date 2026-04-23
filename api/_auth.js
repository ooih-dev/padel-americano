import crypto from 'crypto'

export function validateInitData(initData, botToken) {
  if (!initData || !botToken) return null

  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null

  params.delete('hash')
  const entries = [...params.entries()]
  entries.sort((a, b) => a[0].localeCompare(b[0]))
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n')

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest()

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  if (computedHash !== hash) return null

  const authDate = parseInt(params.get('auth_date') || '0')
  const now = Math.floor(Date.now() / 1000)
  if (now - authDate > 86400) return null

  try {
    const user = JSON.parse(params.get('user') || '{}')
    return {
      id: user.id,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      username: user.username || '',
    }
  } catch {
    return null
  }
}
