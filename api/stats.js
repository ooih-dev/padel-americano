import { getRows, toInt, parseJSON } from './_sheets.js'

async function getPlayerStats(playerName) {
  const allGames = await getRows('Games')
  const allRounds = await getRows('Rounds')
  const allSets = await getRows('Sets')

  const games = allGames.filter(g => {
    const names = parseJSON(g.player_names)
    return names.includes(playerName)
  }).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))

  const totalGames = games.filter(g => g.status === 'finished').length
  let setWins = 0, setLosses = 0, totalScored = 0, totalConceded = 0
  const recentGames = []

  for (const game of games.slice(0, 20)) {
    const rounds = allRounds.filter(r => r.game_id === game.id)
    let myScore = 0, myConc = 0, gameSW = 0, gameSL = 0

    for (const round of rounds) {
      const sets = allSets.filter(s => s.round_id === round.id)
      for (const s of sets) {
        const t1 = parseJSON(s.team1_names)
        const t2 = parseJSON(s.team2_names)
        const s1 = toInt(s.team1_score), s2 = toInt(s.team2_score)

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

    recentGames.push({
      id: toInt(game.id), date: game.created_at, status: game.status,
      players: parseJSON(game.player_names), max_score: toInt(game.max_score),
      my_score: myScore, my_conceded: myConc, is_winner: gameSW > gameSL,
      set_wins: gameSW, set_losses: gameSL, rounds: rounds.length,
    })
  }

  const totalSets = setWins + setLosses
  return {
    player: playerName, total_games: totalGames,
    set_wins: setWins, set_losses: setLosses, wins: setWins, losses: setLosses,
    win_rate: totalSets > 0 ? Math.round((setWins / totalSets) * 100) : 0,
    total_scored: totalScored, total_conceded: totalConceded,
    point_diff: totalScored - totalConceded,
    avg_score: totalGames > 0 ? Math.round(totalScored / totalGames) : 0,
    recent_games: recentGames,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    if (req.query.list === 'players') {
      const allGames = await getRows('Games')
      const allRounds = await getRows('Rounds')
      const gameIdsWithRounds = new Set(allRounds.map(r => r.game_id))

      const nameSet = new Set()
      for (const g of allGames) {
        if (!gameIdsWithRounds.has(g.id)) continue
        for (const name of parseJSON(g.player_names)) nameSet.add(name)
      }
      return res.status(200).json({ players: [...nameSet].sort() })
    }

    const playerName = req.query.player
    if (!playerName) return res.status(400).json({ error: 'player query param required' })

    const stats = await getPlayerStats(playerName)
    return res.status(200).json(stats)
  } catch (err) {
    console.error('Stats handler error:', err.message, err.stack)
    return res.status(500).json({ error: 'Internal error', detail: err.message })
  }
}
