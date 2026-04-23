import { getPool } from './_db.js'
import { validateInitData } from './_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { initData } = req.body || {}
  const botToken = process.env.BOT_TOKEN

  const tgUser = validateInitData(initData, botToken)
  if (!tgUser) {
    return res.status(401).json({ error: 'Invalid Telegram auth' })
  }

  const pool = getPool()
  const name = [tgUser.firstName, tgUser.lastName].filter(Boolean).join(' ') || 'Player'

  const result = await pool.query(
    `INSERT INTO padel_players (telegram_id, name, username)
     VALUES ($1, $2, $3)
     ON CONFLICT (telegram_id) DO UPDATE SET name = $2, username = $3
     RETURNING id, telegram_id, name, username`,
    [tgUser.id, name, tgUser.username]
  )

  return res.status(200).json({ player: result.rows[0] })
}
