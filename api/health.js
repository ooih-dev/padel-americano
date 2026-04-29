import { getRows } from './_sheets.js'

export default async function handler(req, res) {
  const checks = {
    bot_token: !!process.env.BOT_TOKEN,
    google_creds: !!process.env.GOOGLE_CREDENTIALS,
    google_creds_length: (process.env.GOOGLE_CREDENTIALS || '').length,
    sheets_read: false,
    players_count: 0,
    error: null,
  }

  try {
    const players = await getRows('Players')
    checks.sheets_read = true
    checks.players_count = players.length
    checks.player_ids = players.map(p => p.telegram_id)
  } catch (err) {
    checks.error = err.message
  }

  return res.status(200).json(checks)
}
