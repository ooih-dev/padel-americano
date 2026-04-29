import { getRows, appendRow, nextId, toInt, parseJSON, toJSON } from './_sheets.js'
import { validateInitData } from './_auth.js'

function getPlayer(req) {
  const initData = req.headers['x-telegram-init-data']
  if (!initData) return null
  return validateInitData(initData, process.env.BOT_TOKEN)
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const tgUser = getPlayer(req)
      if (!tgUser) return res.status(401).json({ error: 'Auth required' })

      const players = await getRows('Players')
      const player = players.find(p => p.telegram_id === String(tgUser.id))
      if (!player) return res.status(200).json({ games: [] })

      const allGames = await getRows('Games')
      const allRounds = await getRows('Rounds')
      const allGP = await getRows('GamePlayers')

      const myGP = allGP.filter(gp => gp.player_id === player.id)
      const myGameIds = new Set(myGP.map(gp => gp.game_id))

      const games = allGames
        .filter(g => myGameIds.has(g.id))
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
        .slice(0, 50)
        .map(g => ({
          id: toInt(g.id),
          created_by: toInt(g.created_by),
          max_score: toInt(g.max_score),
          player_names: parseJSON(g.player_names),
          status: g.status,
          created_at: g.created_at,
          finished_at: g.finished_at,
          round_count: allRounds.filter(r => r.game_id === g.id).length,
          scores: [],
        }))

      return res.status(200).json({ games })
    }

    if (req.method === 'POST') {
      const tgUser = getPlayer(req)
      if (!tgUser) return res.status(401).json({ error: 'Auth required' })

      const { max_score, player_names } = req.body || {}
      if (!max_score || !player_names || player_names.length !== 4) {
        return res.status(400).json({ error: 'max_score and 4 player_names required' })
      }

      const players = await getRows('Players')
      const player = players.find(p => p.telegram_id === String(tgUser.id))
      if (!player) return res.status(400).json({ error: 'Player not found, auth first' })

      const gameId = await nextId('Games')
      const now = new Date().toISOString()
      const game = {
        id: gameId, created_by: player.id, max_score,
        player_names: toJSON(player_names), status: 'active', created_at: now, finished_at: '',
      }
      await appendRow('Games', game)
      await appendRow('GamePlayers', { game_id: gameId, player_id: player.id, total_score: 0 })

      return res.status(201).json({ game: { ...game, id: gameId, player_names } })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Games handler error:', err.message, err.stack)
    return res.status(500).json({ error: 'Internal error', detail: err.message })
  }
}
