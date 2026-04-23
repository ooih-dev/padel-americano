import { getPool } from './_db.js'
import { validateInitData } from './_auth.js'

function getPlayer(req) {
  const initData = req.headers['x-telegram-init-data']
  if (!initData) return null
  return validateInitData(initData, process.env.BOT_TOKEN)
}

export default async function handler(req, res) {
  const pool = getPool()

  if (req.method === 'GET') {
    const tgUser = getPlayer(req)
    if (!tgUser) return res.status(401).json({ error: 'Auth required' })

    const result = await pool.query(
      `SELECT g.* FROM padel_games g
       JOIN padel_game_players gp ON gp.game_id = g.id
       JOIN padel_players p ON p.id = gp.player_id
       WHERE p.telegram_id = $1
       ORDER BY g.created_at DESC
       LIMIT 50`,
      [tgUser.id]
    )

    for (const game of result.rows) {
      const rounds = await pool.query(
        `SELECT r.id, r.round_number FROM padel_rounds r WHERE r.game_id = $1 ORDER BY r.round_number`,
        [game.id]
      )
      game.round_count = rounds.rows.length

      const scores = await pool.query(
        `SELECT p.name, gp.total_score FROM padel_game_players gp
         JOIN padel_players p ON p.id = gp.player_id
         WHERE gp.game_id = $1 ORDER BY gp.total_score DESC`,
        [game.id]
      )
      game.scores = scores.rows
    }

    return res.status(200).json({ games: result.rows })
  }

  if (req.method === 'POST') {
    const tgUser = getPlayer(req)
    if (!tgUser) return res.status(401).json({ error: 'Auth required' })

    const { max_score, player_names } = req.body || {}
    if (!max_score || !player_names || player_names.length !== 4) {
      return res.status(400).json({ error: 'max_score and 4 player_names required' })
    }

    const playerRes = await pool.query(
      'SELECT id FROM padel_players WHERE telegram_id = $1', [tgUser.id]
    )
    if (playerRes.rows.length === 0) {
      return res.status(400).json({ error: 'Player not found, auth first' })
    }
    const playerId = playerRes.rows[0].id

    const gameRes = await pool.query(
      `INSERT INTO padel_games (created_by, max_score, player_names)
       VALUES ($1, $2, $3) RETURNING *`,
      [playerId, max_score, JSON.stringify(player_names)]
    )
    const game = gameRes.rows[0]

    await pool.query(
      `INSERT INTO padel_game_players (game_id, player_id, total_score)
       VALUES ($1, $2, 0)`,
      [game.id, playerId]
    )

    return res.status(201).json({ game })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
