import { getRows, appendRow, updateRow, nextId } from './_sheets.js'
import { validateInitData } from './_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { initData } = req.body || {}
  const tgUser = validateInitData(initData, process.env.BOT_TOKEN)
  if (!tgUser) return res.status(401).json({ error: 'Invalid Telegram auth' })

  const name = [tgUser.firstName, tgUser.lastName].filter(Boolean).join(' ') || 'Player'
  const players = await getRows('Players')
  const existing = players.find(p => p.telegram_id === String(tgUser.id))

  if (existing) {
    await updateRow('Players', existing._rowIndex, {
      id: existing.id, telegram_id: tgUser.id, name, username: tgUser.username,
    })
    return res.status(200).json({ player: { id: parseInt(existing.id), telegram_id: tgUser.id, name, username: tgUser.username } })
  }

  const id = await nextId('Players')
  await appendRow('Players', { id, telegram_id: tgUser.id, name, username: tgUser.username })
  return res.status(200).json({ player: { id, telegram_id: tgUser.id, name, username: tgUser.username } })
}
