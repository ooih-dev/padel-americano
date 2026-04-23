import { getPool } from './_db.js'
import { validateInitData } from './_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const initData = req.headers['x-telegram-init-data']
  if (!initData) return res.status(401).json({ error: 'Auth required' })

  const tgUser = validateInitData(initData, process.env.BOT_TOKEN)
  if (!tgUser) return res.status(401).json({ error: 'Invalid auth' })

  const pool = getPool()

  const playerRes = await pool.query(
    'SELECT id, name FROM padel_players WHERE telegram_id = $1', [tgUser.id]
  )
  if (playerRes.rows.length === 0) return res.status(404).json({ error: 'Player not found' })

  const player = playerRes.rows[0]

  const gamesRes = await pool.query(
    `SELECT g.id, g.max_score, g.status, g.player_names, g.created_at, g.finished_at
     FROM padel_games g
     JOIN padel_game_players gp ON gp.game_id = g.id
     WHERE gp.player_id = $1
     ORDER BY g.created_at DESC`,
    [player.id]
  )

  const totalGames = gamesRes.rows.filter(g => g.status === 'finished').length
  let wins = 0
  let totalScored = 0
  let totalConceded = 0

  const recentGames = []

  for (const game of gamesRes.rows.slice(0, 20)) {
    const scoresRes = await pool.query(
      `SELECT p.name, gp.total_score FROM padel_game_players gp
       JOIN padel_players p ON p.id = gp.player_id
       WHERE gp.game_id = $1 ORDER BY gp.total_score DESC`,
      [game.id]
    )

    const roundsRes = await pool.query(
      'SELECT id, round_number FROM padel_rounds WHERE game_id = $1 ORDER BY round_number', [game.id]
    )

    let myScore = 0
    let myConc = 0
    for (const round of roundsRes.rows) {
      const setsRes = await pool.query(
        'SELECT team1_names, team2_names, team1_score, team2_score FROM padel_sets WHERE round_id = $1',
        [round.id]
      )
      for (const s of setsRes.rows) {
        const t1 = typeof s.team1_names === 'string' ? JSON.parse(s.team1_names) : s.team1_names
        const t2 = typeof s.team2_names === 'string' ? JSON.parse(s.team2_names) : s.team2_names
        if (t1.includes(player.name)) {
          myScore += s.team1_score || 0
          myConc += s.team2_score || 0
        } else if (t2.includes(player.name)) {
          myScore += s.team2_score || 0
          myConc += s.team1_score || 0
        }
      }
    }

    totalScored += myScore
    totalConceded += myConc

    const playerNames = typeof game.player_names === 'string' ? JSON.parse(game.player_names) : game.player_names
    const isWinner = scoresRes.rows.length > 0 && scoresRes.rows[0].name === player.name
    if (game.status === 'finished' && isWinner) wins++

    recentGames.push({
      id: game.id,
      date: game.created_at,
      status: game.status,
      players: playerNames,
      max_score: game.max_score,
      my_score: myScore,
      my_conceded: myConc,
      is_winner: isWinner,
      scores: scoresRes.rows,
      rounds: roundsRes.rows.length,
    })
  }

  return res.status(200).json({
    player: player.name,
    total_games: totalGames,
    wins,
    losses: totalGames - wins,
    win_rate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
    total_scored: totalScored,
    total_conceded: totalConceded,
    point_diff: totalScored - totalConceded,
    avg_score: totalGames > 0 ? Math.round(totalScored / totalGames) : 0,
    recent_games: recentGames,
  })
}
