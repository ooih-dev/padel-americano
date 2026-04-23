import { getPool } from '../_db.js'
import { validateInitData } from '../_auth.js'

function getPlayer(req) {
  const initData = req.headers['x-telegram-init-data']
  if (!initData) return null
  return validateInitData(initData, process.env.BOT_TOKEN)
}

export default async function handler(req, res) {
  const pool = getPool()
  const gameId = parseInt(req.query.id)

  if (isNaN(gameId)) return res.status(400).json({ error: 'Invalid game id' })

  if (req.method === 'GET') {
    const game = await pool.query('SELECT * FROM padel_games WHERE id = $1', [gameId])
    if (game.rows.length === 0) return res.status(404).json({ error: 'Game not found' })

    const rounds = await pool.query(
      'SELECT * FROM padel_rounds WHERE game_id = $1 ORDER BY round_number', [gameId]
    )

    for (const round of rounds.rows) {
      const sets = await pool.query(
        'SELECT * FROM padel_sets WHERE round_id = $1 ORDER BY set_number', [round.id]
      )
      round.sets = sets.rows
    }

    const scores = await pool.query(
      `SELECT p.name, gp.total_score FROM padel_game_players gp
       JOIN padel_players p ON p.id = gp.player_id
       WHERE gp.game_id = $1 ORDER BY gp.total_score DESC`,
      [gameId]
    )

    return res.status(200).json({
      game: game.rows[0],
      rounds: rounds.rows,
      scores: scores.rows,
    })
  }

  if (req.method === 'PATCH') {
    const tgUser = getPlayer(req)
    if (!tgUser) return res.status(401).json({ error: 'Auth required' })

    const { action } = req.body || {}

    if (action === 'add_round') {
      const { round_number, sets } = req.body
      if (!round_number || !sets || !Array.isArray(sets)) {
        return res.status(400).json({ error: 'round_number and sets required' })
      }

      const roundRes = await pool.query(
        'INSERT INTO padel_rounds (game_id, round_number) VALUES ($1, $2) RETURNING id',
        [gameId, round_number]
      )
      const roundId = roundRes.rows[0].id

      for (const s of sets) {
        await pool.query(
          `INSERT INTO padel_sets (round_id, set_number, team1_names, team2_names, team1_score, team2_score)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [roundId, s.set_number, JSON.stringify(s.team1_names), JSON.stringify(s.team2_names), s.team1_score, s.team2_score]
        )
      }

      return res.status(200).json({ round_id: roundId })
    }

    if (action === 'finish') {
      const { final_scores } = req.body
      await pool.query(
        "UPDATE padel_games SET status = 'finished', finished_at = NOW() WHERE id = $1",
        [gameId]
      )

      if (final_scores && typeof final_scores === 'object') {
        const playerRes = await pool.query('SELECT id FROM padel_players WHERE telegram_id = $1', [tgUser.id])
        if (playerRes.rows.length > 0) {
          const playerId = playerRes.rows[0].id
          const totalScore = Object.values(final_scores).reduce((a, b) => a + b, 0) / 4
          await pool.query(
            `UPDATE padel_game_players SET total_score = $1 WHERE game_id = $2 AND player_id = $3`,
            [Math.round(totalScore), gameId, playerId]
          )
        }
      }

      return res.status(200).json({ status: 'finished' })
    }

    return res.status(400).json({ error: 'Unknown action' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
