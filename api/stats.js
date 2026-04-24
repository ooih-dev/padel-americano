import { getPool } from './_db.js'

async function getPlayerStats(pool, playerName) {
  const gamesRes = await pool.query(
    `SELECT DISTINCT g.id, g.max_score, g.status, g.player_names, g.created_at
     FROM padel_games g
     WHERE g.player_names::text LIKE $1
     ORDER BY g.created_at DESC`,
    [`%${playerName}%`]
  )

  const games = gamesRes.rows.filter(g => {
    const names = typeof g.player_names === 'string' ? JSON.parse(g.player_names) : g.player_names
    return names.includes(playerName)
  })

  const totalGames = games.filter(g => g.status === 'finished').length
  let setWins = 0
  let setLosses = 0
  let totalScored = 0
  let totalConceded = 0
  const recentGames = []

  for (const game of games.slice(0, 20)) {
    const roundsRes = await pool.query(
      'SELECT id FROM padel_rounds WHERE game_id = $1 ORDER BY round_number', [game.id]
    )

    let myScore = 0
    let myConc = 0
    let gameSW = 0
    let gameSL = 0

    for (const round of roundsRes.rows) {
      const setsRes = await pool.query(
        'SELECT team1_names, team2_names, team1_score, team2_score FROM padel_sets WHERE round_id = $1',
        [round.id]
      )
      for (const s of setsRes.rows) {
        const t1 = typeof s.team1_names === 'string' ? JSON.parse(s.team1_names) : s.team1_names
        const t2 = typeof s.team2_names === 'string' ? JSON.parse(s.team2_names) : s.team2_names
        const s1 = s.team1_score || 0
        const s2 = s.team2_score || 0

        if (t1.includes(playerName)) {
          myScore += s1; myConc += s2
          if (s1 > s2) { setWins++; gameSW++ } else if (s2 > s1) { setLosses++; gameSL++ }
        } else if (t2.includes(playerName)) {
          myScore += s2; myConc += s1
          if (s2 > s1) { setWins++; gameSW++ } else if (s1 > s2) { setLosses++; gameSL++ }
        }
      }
    }

    totalScored += myScore
    totalConceded += myConc

    const playerNames = typeof game.player_names === 'string' ? JSON.parse(game.player_names) : game.player_names

    recentGames.push({
      id: game.id,
      date: game.created_at,
      status: game.status,
      players: playerNames,
      max_score: game.max_score,
      my_score: myScore,
      my_conceded: myConc,
      is_winner: gameSW > gameSL,
      set_wins: gameSW,
      set_losses: gameSL,
      rounds: roundsRes.rows.length,
    })
  }

  const totalSets = setWins + setLosses
  return {
    player: playerName,
    total_games: totalGames,
    set_wins: setWins,
    set_losses: setLosses,
    wins: setWins,
    losses: setLosses,
    win_rate: totalSets > 0 ? Math.round((setWins / totalSets) * 100) : 0,
    total_scored: totalScored,
    total_conceded: totalConceded,
    point_diff: totalScored - totalConceded,
    avg_score: totalGames > 0 ? Math.round(totalScored / totalGames) : 0,
    recent_games: recentGames,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const pool = getPool()

  if (req.query.list === 'players') {
    const result = await pool.query(
      `SELECT DISTINCT player_name FROM (
        SELECT jsonb_array_elements_text(g.player_names) AS player_name
        FROM padel_games g
        WHERE EXISTS (SELECT 1 FROM padel_rounds r WHERE r.game_id = g.id)
      ) sub ORDER BY player_name`
    )
    return res.status(200).json({ players: result.rows.map(r => r.player_name) })
  }

  const playerName = req.query.player
  if (!playerName) {
    return res.status(400).json({ error: 'player query param required' })
  }

  const stats = await getPlayerStats(pool, playerName)
  return res.status(200).json(stats)
}
