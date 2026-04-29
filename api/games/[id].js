import { getRows, appendRow, updateRow, deleteRows, nextId, toInt, parseJSON, toJSON } from '../_sheets.js'
import { validateInitData } from '../_auth.js'

function getPlayer(req) {
  const initData = req.headers['x-telegram-init-data']
  if (!initData) return null
  return validateInitData(initData, process.env.BOT_TOKEN)
}

export default async function handler(req, res) {
  try {
  const gameId = String(req.query.id)

  if (req.method === 'GET') {
    const games = await getRows('Games')
    const game = games.find(g => g.id === gameId)
    if (!game) return res.status(404).json({ error: 'Game not found' })

    const allRounds = await getRows('Rounds')
    const allSets = await getRows('Sets')

    const rounds = allRounds
      .filter(r => r.game_id === gameId)
      .sort((a, b) => toInt(a.round_number) - toInt(b.round_number))
      .map(r => ({
        id: toInt(r.id),
        game_id: toInt(r.game_id),
        round_number: toInt(r.round_number),
        sets: allSets
          .filter(s => s.round_id === r.id)
          .sort((a, b) => toInt(a.set_number) - toInt(b.set_number))
          .map(s => ({
            id: toInt(s.id),
            round_id: toInt(s.round_id),
            set_number: toInt(s.set_number),
            team1_names: parseJSON(s.team1_names),
            team2_names: parseJSON(s.team2_names),
            team1_score: toInt(s.team1_score),
            team2_score: toInt(s.team2_score),
          })),
      }))

    return res.status(200).json({
      game: {
        id: toInt(game.id), created_by: toInt(game.created_by), max_score: toInt(game.max_score),
        player_names: parseJSON(game.player_names), status: game.status,
        created_at: game.created_at, finished_at: game.finished_at,
      },
      rounds,
      scores: [],
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

      const roundId = await nextId('Rounds')
      await appendRow('Rounds', { id: roundId, game_id: gameId, round_number })

      for (const s of sets) {
        const setId = await nextId('Sets')
        await appendRow('Sets', {
          id: setId, round_id: roundId, set_number: s.set_number,
          team1_names: toJSON(s.team1_names), team2_names: toJSON(s.team2_names),
          team1_score: s.team1_score, team2_score: s.team2_score,
        })
      }

      return res.status(200).json({ round_id: roundId })
    }

    if (action === 'finish') {
      const games = await getRows('Games')
      const game = games.find(g => g.id === gameId)
      if (!game) return res.status(404).json({ error: 'Game not found' })

      await updateRow('Games', game._rowIndex, {
        ...game, status: 'finished', finished_at: new Date().toISOString(),
      })
      return res.status(200).json({ status: 'finished' })
    }

    if (action === 'edit_round') {
      const { round_number, sets } = req.body
      if (!round_number || !sets || !Array.isArray(sets)) {
        return res.status(400).json({ error: 'round_number and sets required' })
      }

      const allRounds = await getRows('Rounds')
      const round = allRounds.find(r => r.game_id === gameId && r.round_number === String(round_number))
      if (!round) return res.status(404).json({ error: 'Round not found' })

      const allSets = await getRows('Sets')
      for (const s of sets) {
        const existing = allSets.find(ss => ss.round_id === round.id && ss.set_number === String(s.set_number))
        if (existing) {
          await updateRow('Sets', existing._rowIndex, {
            ...existing, team1_score: s.team1_score, team2_score: s.team2_score,
          })
        }
      }
      return res.status(200).json({ updated: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  }

  if (req.method === 'DELETE') {
    const tgUser = getPlayer(req)
    if (!tgUser) return res.status(401).json({ error: 'Auth required' })

    const allRounds = await getRows('Rounds')
    const allSets = await getRows('Sets')
    const allGP = await getRows('GamePlayers')
    const games = await getRows('Games')

    const roundRows = allRounds.filter(r => r.game_id === gameId)
    const roundIds = new Set(roundRows.map(r => r.id))
    const setRows = allSets.filter(s => roundIds.has(s.round_id))
    const gpRows = allGP.filter(gp => gp.game_id === gameId)
    const gameRow = games.find(g => g.id === gameId)

    await deleteRows('Sets', setRows.map(s => s._rowIndex))

    const freshRounds = await getRows('Rounds')
    const freshRoundRows = freshRounds.filter(r => r.game_id === gameId)
    await deleteRows('Rounds', freshRoundRows.map(r => r._rowIndex))

    const freshGP = await getRows('GamePlayers')
    const freshGPRows = freshGP.filter(gp => gp.game_id === gameId)
    await deleteRows('GamePlayers', freshGPRows.map(gp => gp._rowIndex))

    const freshGames = await getRows('Games')
    const freshGame = freshGames.find(g => g.id === gameId)
    if (freshGame) await deleteRows('Games', [freshGame._rowIndex])

    return res.status(200).json({ deleted: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Game handler error:', err.message, err.stack)
    return res.status(500).json({ error: 'Internal error', detail: err.message })
  }
}
