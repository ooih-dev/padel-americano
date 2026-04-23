import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import './index.css'

const AuthContext = createContext(null)
function useAuth() { return useContext(AuthContext) }

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateSets(players) {
  const [a, b, c, d] = shuffle([0, 1, 2, 3])
  return [
    { team1: [players[a], players[b]], team2: [players[c], players[d]] },
    { team1: [players[a], players[c]], team2: [players[b], players[d]] },
    { team1: [players[a], players[d]], team2: [players[b], players[c]] },
  ]
}

function calcDiff(playerName, roundHistory) {
  let diff = 0
  for (const round of roundHistory) {
    for (const set of round.sets) {
      if (set.team1.includes(playerName)) {
        diff += (set.scores?.team1 || 0) - (set.scores?.team2 || 0)
      } else if (set.team2.includes(playerName)) {
        diff += (set.scores?.team2 || 0) - (set.scores?.team1 || 0)
      }
    }
  }
  return diff
}

function PlayerInput({ value, onChange, placeholder, knownNames }) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const ref = useRef(null)

  const filtered = knownNames.filter(n =>
    n.toLowerCase().includes(value.toLowerCase()) && n !== value
  ).slice(0, 5)

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => { onChange(e.target.value); setShowSuggestions(true) }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 text-base"
      />
      {showSuggestions && value.length > 0 && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e2344] border border-white/10 rounded-xl overflow-hidden z-10">
          {filtered.map(n => (
            <button
              key={n}
              onMouseDown={() => { onChange(n); setShowSuggestions(false) }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/10 transition-colors"
            >{n}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function SetupScreen({ onStart, onShowHistory, onShowStats }) {
  const auth = useAuth()
  const [names, setNames] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('padel_names')) || ['', '', '', '']
      return saved
    } catch { return ['', '', '', ''] }
  })
  const [maxScore, setMaxScore] = useState(21)
  const [knownNames, setKnownNames] = useState([])

  useEffect(() => {
    if (auth?.player && names[0] === '') {
      const n = [...names]
      n[0] = auth.player.name
      setNames(n)
    }
  }, [auth])

  useEffect(() => {
    try {
      const prev = JSON.parse(localStorage.getItem('padel_known_names') || '[]')
      setKnownNames(prev)
    } catch {}
  }, [])

  const updateName = (i, val) => {
    const n = [...names]
    n[i] = val
    setNames(n)
  }

  const canStart = names.every(n => n.trim().length > 0)

  const handleStart = () => {
    if (!canStart) return
    const trimmed = names.map(n => n.trim())
    localStorage.setItem('padel_names', JSON.stringify(trimmed))
    const all = new Set([...knownNames, ...trimmed])
    localStorage.setItem('padel_known_names', JSON.stringify([...all]))
    onStart(trimmed, maxScore)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎾</div>
          <h1 className="text-2xl font-bold text-white mb-1">Padel Americano</h1>
          <p className="text-sm text-gray-400">Счётчик очков</p>
          {auth?.player && (
            <p className="text-xs text-green-400 mt-1">👤 {auth.player.name}</p>
          )}
        </div>

        <div className="space-y-3 mb-6">
          {names.map((name, i) => (
            <PlayerInput
              key={i}
              value={name}
              onChange={val => updateName(i, val)}
              placeholder={`Игрок ${i + 1}`}
              knownNames={knownNames}
            />
          ))}
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-2 text-center">Очков за сет</p>
          <div className="flex gap-2 justify-center items-center">
            {[21, 31].map(s => (
              <button
                key={s}
                onClick={() => setMaxScore(s)}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                  maxScore === s
                    ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                    : 'bg-white/10 text-gray-300 hover:bg-white/15'
                }`}
              >{s}</button>
            ))}
            <input
              type="number"
              min="1"
              max="999"
              placeholder="Своё"
              value={maxScore !== 21 && maxScore !== 31 ? maxScore : ''}
              onChange={e => {
                const v = parseInt(e.target.value)
                if (v > 0) setMaxScore(v)
              }}
              onFocus={() => { if (maxScore === 21 || maxScore === 31) setMaxScore('') }}
              onBlur={() => { if (!maxScore || maxScore <= 0) setMaxScore(21) }}
              className={`w-20 px-3 py-2 rounded-xl text-sm font-medium text-center transition-all ${
                maxScore !== 21 && maxScore !== 31 && maxScore !== ''
                  ? 'bg-green-600 text-white shadow-lg shadow-green-600/30 border border-green-600'
                  : 'bg-white/10 text-gray-300 border border-white/10'
              }`}
              inputMode="numeric"
            />
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={!canStart}
          className={`w-full py-3.5 rounded-xl text-base font-semibold transition-all ${
            canStart
              ? 'bg-green-600 text-white shadow-lg shadow-green-600/30 active:scale-[0.98]'
              : 'bg-white/5 text-gray-600 cursor-not-allowed'
          }`}
        >Начать игру</button>

        <div className="flex gap-2 mt-3">
          {auth?.player && (
            <button
              onClick={onShowHistory}
              className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 text-sm font-medium hover:bg-white/10 transition-all"
            >📋 История</button>
          )}
          <button
            onClick={onShowStats}
            className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 text-sm font-medium hover:bg-white/10 transition-all"
          >📊 Статистика</button>
        </div>
      </div>
    </div>
  )
}

function GameScreen({ players, maxScore, scores, onFinish, roundNum, onNewRound, roundHistory, gameId }) {
  const [sets, setSets] = useState(() => generateSets(players))
  const [setScores, setSetScores] = useState([null, null, null])
  const [currentSet, setCurrentSet] = useState(0)
  const [localScores, setLocalScores] = useState({ ...scores })
  const [completedSets, setCompletedSets] = useState([])
  const [localRoundHistory, setLocalRoundHistory] = useState(roundHistory)
  const [editingRound, setEditingRound] = useState(null)
  const [editScores, setEditScores] = useState({})
  const auth = useAuth()

  const handleScore = (setIdx, team1Score) => {
    const score = Math.min(Math.max(0, team1Score), maxScore)
    const team2Score = maxScore - score
    const newSetScores = [...setScores]
    newSetScores[setIdx] = { team1: score, team2: team2Score }
    setSetScores(newSetScores)
  }

  const confirmSet = (setIdx) => {
    if (setScores[setIdx] === null) return
    const s = setScores[setIdx]
    const set = sets[setIdx]
    const newScores = { ...localScores }
    set.team1.forEach(p => { newScores[p] = (newScores[p] || 0) + s.team1 })
    set.team2.forEach(p => { newScores[p] = (newScores[p] || 0) + s.team2 })
    setLocalScores(newScores)

    const newCompleted = [...completedSets, setIdx]
    setCompletedSets(newCompleted)

    const updatedHistory = [...localRoundHistory]
    if (!updatedHistory[roundNum - 1]) {
      updatedHistory[roundNum - 1] = { sets: sets.map(st => ({ team1: st.team1, team2: st.team2, scores: null })) }
    }
    updatedHistory[roundNum - 1].sets[setIdx].scores = { team1: s.team1, team2: s.team2 }
    setLocalRoundHistory(updatedHistory)

    if (setIdx < 2) setCurrentSet(setIdx + 1)
  }

  const startEditPrevRound = (ri) => {
    const round = localRoundHistory[ri]
    if (!round) return
    setEditingRound(ri)
    const es = {}
    round.sets.forEach((s, si) => {
      es[si] = { team1: s.scores?.team1 ?? 0, team2: s.scores?.team2 ?? 0 }
    })
    setEditScores(es)
  }

  const saveEditPrevRound = (ri) => {
    const round = localRoundHistory[ri]
    if (!round) return

    const recalcScores = {}
    players.forEach(p => { recalcScores[p] = 0 })

    const updatedHistory = [...localRoundHistory]
    round.sets.forEach((s, si) => {
      updatedHistory[ri].sets[si].scores = { team1: editScores[si].team1, team2: editScores[si].team2 }
    })

    updatedHistory.filter(Boolean).forEach((r, rIdx) => {
      if (rIdx === roundNum - 1 && completedSets.length < 3) return
      r.sets.forEach(s => {
        if (!s.scores) return
        s.team1.forEach(p => { recalcScores[p] = (recalcScores[p] || 0) + s.scores.team1 })
        s.team2.forEach(p => { recalcScores[p] = (recalcScores[p] || 0) + s.scores.team2 })
      })
    })
    if (completedSets.length > 0) {
      const curRound = updatedHistory[roundNum - 1]
      if (curRound) {
        completedSets.forEach(si => {
          const s = curRound.sets[si]
          if (s?.scores) {
            s.team1.forEach(p => { recalcScores[p] = (recalcScores[p] || 0) + s.scores.team1 })
            s.team2.forEach(p => { recalcScores[p] = (recalcScores[p] || 0) + s.scores.team2 })
          }
        })
      }
    }

    setLocalRoundHistory(updatedHistory)
    setLocalScores(recalcScores)
    setEditingRound(null)

    if (auth?.initData && gameId) {
      const apiSets = round.sets.map((s, si) => ({
        set_number: si + 1,
        team1_score: editScores[si].team1,
        team2_score: editScores[si].team2,
      }))
      fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': auth.initData },
        body: JSON.stringify({ action: 'edit_round', round_number: ri + 1, sets: apiSets }),
      }).catch(() => {})
    }
  }

  const allDone = completedSets.length === 3
  const previousRounds = localRoundHistory.slice(0, roundNum - 1).filter(Boolean)

  const leaderboard = players
    .map(p => ({
      name: p,
      score: localScores[p] || 0,
      diff: calcDiff(p, localRoundHistory.filter(Boolean)),
    }))
    .sort((a, b) => b.score - a.score || b.diff - a.diff)

  const startNewRound = () => {
    onNewRound(localScores, localRoundHistory)
    setSets(generateSets(players))
    setSetScores([null, null, null])
    setCurrentSet(0)
    setCompletedSets([])
  }

  return (
    <div className="min-h-screen px-4 py-6 pb-32">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-bold text-white">Раунд {roundNum}</h1>
          <span className="text-xs text-gray-400">
            Сет {Math.min(completedSets.length + 1, 3)}/3 · до {maxScore} очков
          </span>
        </div>

        <div className="bg-white/5 rounded-2xl p-4 mb-5">
          <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3">Таблица</h2>
          <div className="space-y-2">
            {leaderboard.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    i === 1 ? 'bg-gray-400/20 text-gray-300' :
                    i === 2 ? 'bg-amber-700/20 text-amber-600' :
                    'bg-white/5 text-gray-500'
                  }`}>{i + 1}</span>
                  <span className="text-sm text-white">{p.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${p.diff >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                    {p.diff >= 0 ? '+' : ''}{p.diff}
                  </span>
                  <span className="text-sm font-mono font-bold text-green-400 w-8 text-right">{p.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {sets.map((set, idx) => {
            const done = completedSets.includes(idx)
            const active = idx === currentSet && !done
            return (
              <div
                key={idx}
                className={`rounded-2xl p-4 transition-all ${
                  done ? 'bg-green-900/20 border border-green-800/30' :
                  active ? 'bg-white/10 border border-white/15' :
                  'bg-white/5 border border-transparent opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Сет {idx + 1}</span>
                  {done && <span className="text-xs text-green-400">✓</span>}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 text-center">
                    <p className="text-xs text-gray-400 mb-1">{set.team1[0]} & {set.team1[1]}</p>
                    {done ? (
                      <span className="text-xl font-bold text-white">{setScores[idx]?.team1}</span>
                    ) : active ? (
                      <input
                        type="number" min="0" max={maxScore} placeholder="0"
                        value={setScores[idx]?.team1 ?? ''}
                        onChange={e => handleScore(idx, parseInt(e.target.value) || 0)}
                        className="w-16 mx-auto text-center text-xl font-bold bg-white/10 rounded-lg py-1.5 text-white border border-white/10"
                        inputMode="numeric"
                      />
                    ) : <span className="text-xl text-gray-600">—</span>}
                  </div>
                  <span className="text-gray-500 text-sm font-bold">vs</span>
                  <div className="flex-1 text-center">
                    <p className="text-xs text-gray-400 mb-1">{set.team2[0]} & {set.team2[1]}</p>
                    {done ? (
                      <span className="text-xl font-bold text-white">{setScores[idx]?.team2}</span>
                    ) : active && setScores[idx] !== null ? (
                      <span className="text-xl font-bold text-green-400">{setScores[idx]?.team2}</span>
                    ) : <span className="text-xl text-gray-600">—</span>}
                  </div>
                </div>

                {active && !done && setScores[idx] !== null && (
                  <button
                    onClick={() => confirmSet(idx)}
                    className="w-full mt-3 py-2 rounded-xl bg-green-600 text-white text-sm font-medium active:scale-[0.98] transition-transform"
                  >Подтвердить</button>
                )}
              </div>
            )
          })}
        </div>

        {allDone && (
          <div className="mt-6 space-y-3">
            {roundNum < 12 && (
              <button
                onClick={startNewRound}
                className="w-full py-3 rounded-xl bg-green-600 text-white text-sm font-semibold shadow-lg shadow-green-600/30 active:scale-[0.98] transition-all"
              >Следующий раунд →</button>
            )}
            <button
              onClick={() => onFinish(localScores, localRoundHistory)}
              className="w-full py-3 rounded-xl border border-red-500/40 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-all"
            >Завершить игру</button>
          </div>
        )}

        {previousRounds.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3">Предыдущие раунды</h2>
            {previousRounds.map((round, ri) => (
              <div key={ri} className="bg-white/5 rounded-2xl p-3 mb-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400">Раунд {ri + 1}</span>
                  {editingRound === ri ? (
                    <div className="flex gap-2">
                      <button onClick={() => saveEditPrevRound(ri)} className="text-xs text-green-400">Сохранить</button>
                      <button onClick={() => setEditingRound(null)} className="text-xs text-gray-400">Отмена</button>
                    </div>
                  ) : (
                    <button onClick={() => startEditPrevRound(ri)} className="text-xs text-blue-400">✏️</button>
                  )}
                </div>
                {round.sets.map((s, si) => (
                  <div key={si} className="flex items-center justify-between gap-2 mb-1 text-xs">
                    <span className="text-gray-400 flex-1 text-right truncate">{s.team1.join(' & ')}</span>
                    {editingRound === ri ? (
                      <>
                        <input type="number" inputMode="numeric" className="w-10 text-center bg-white/10 rounded py-0.5 text-white border border-white/20 text-xs"
                          value={editScores[si]?.team1 ?? 0}
                          onChange={e => setEditScores({ ...editScores, [si]: { ...editScores[si], team1: parseInt(e.target.value) || 0 } })}
                        />
                        <span className="text-gray-500">:</span>
                        <input type="number" inputMode="numeric" className="w-10 text-center bg-white/10 rounded py-0.5 text-white border border-white/20 text-xs"
                          value={editScores[si]?.team2 ?? 0}
                          onChange={e => setEditScores({ ...editScores, [si]: { ...editScores[si], team2: parseInt(e.target.value) || 0 } })}
                        />
                      </>
                    ) : (
                      <span className="text-white font-mono">{s.scores?.team1 ?? 0}:{s.scores?.team2 ?? 0}</span>
                    )}
                    <span className="text-gray-400 flex-1 truncate">{s.team2.join(' & ')}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ResultsScreen({ players, scores, roundHistory, onNewGame }) {
  const [shared, setShared] = useState(false)

  const leaderboard = players
    .map(p => ({
      name: p,
      score: scores[p] || 0,
      diff: calcDiff(p, roundHistory.filter(Boolean)),
    }))
    .sort((a, b) => b.score - a.score || b.diff - a.diff)

  const medals = ['🥇', '🥈', '🥉', '']
  const colors = [
    'from-yellow-500/20 to-yellow-600/5 border-yellow-500/30',
    'from-gray-400/20 to-gray-500/5 border-gray-400/30',
    'from-amber-700/20 to-amber-800/5 border-amber-600/30',
    'from-white/5 to-white/0 border-white/10',
  ]

  const shareText = `🎾 Padel Americano\n${leaderboard.map((p, i) =>
    `${medals[Math.min(i, 3)]} ${p.name} — ${p.score} очк. (${p.diff >= 0 ? '+' : ''}${p.diff})`
  ).join('\n')}`

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText })
      } else {
        await navigator.clipboard.writeText(shareText)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      }
    } catch {}
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-2xl font-bold text-white mb-1">Результаты</h1>
          <p className="text-xs text-gray-400">Раундов: {roundHistory.filter(Boolean).length}</p>
        </div>

        <div className="space-y-3 mb-6">
          {leaderboard.map((p, i) => (
            <div
              key={p.name}
              className={`flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r border ${colors[Math.min(i, 3)]}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl w-8">{medals[Math.min(i, 3)]}</span>
                <div className="text-left">
                  <p className="text-white font-semibold">{p.name}</p>
                  <p className="text-xs text-gray-400">разница: {p.diff >= 0 ? '+' : ''}{p.diff}</p>
                </div>
              </div>
              <span className="text-2xl font-mono font-bold text-green-400">{p.score}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <button onClick={handleShare}
            className="w-full py-3 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/15 transition-all"
          >{shared ? '✓ Скопировано!' : '📤 Поделиться'}</button>
          <button onClick={onNewGame}
            className="w-full py-3.5 rounded-xl bg-green-600 text-white text-base font-semibold shadow-lg shadow-green-600/30 active:scale-[0.98] transition-all"
          >Новая игра</button>
        </div>
      </div>
    </div>
  )
}

function GameDetailScreen({ gameId, onBack }) {
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [editScores, setEditScores] = useState({})
  const [saving, setSaving] = useState(false)
  const auth = useAuth()

  const loadGame = () => {
    fetch(`/api/games/${gameId}`)
      .then(r => r.json())
      .then(data => { setGame(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadGame() }, [gameId])

  const startEdit = (roundIdx, round) => {
    setEditing(roundIdx)
    const scores = {}
    round.sets.forEach(s => {
      scores[s.set_number] = { team1: s.team1_score, team2: s.team2_score }
    })
    setEditScores(scores)
  }

  const handleSave = async (round) => {
    if (!auth?.initData) return
    setSaving(true)
    const sets = round.sets.map(s => ({
      set_number: s.set_number,
      team1_score: editScores[s.set_number]?.team1 ?? s.team1_score,
      team2_score: editScores[s.set_number]?.team2 ?? s.team2_score,
    }))
    try {
      await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': auth.initData },
        body: JSON.stringify({ action: 'edit_round', round_number: round.round_number, sets }),
      })
      setEditing(null)
      loadGame()
    } catch {}
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen px-4 py-6"><div className="max-w-sm mx-auto"><p className="text-gray-400 text-center py-8">Загрузка...</p></div></div>
  if (!game) return <div className="min-h-screen px-4 py-6"><div className="max-w-sm mx-auto"><button onClick={onBack} className="text-gray-400 text-sm">← Назад</button><p className="text-gray-400 text-center py-8">Игра не найдена</p></div></div>

  const g = game.game
  const playerNames = typeof g.player_names === 'string' ? JSON.parse(g.player_names) : g.player_names

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-gray-400 hover:text-white text-sm">← Назад</button>
          <h1 className="text-lg font-bold text-white">Игра</h1>
        </div>

        <div className="bg-white/5 rounded-2xl p-4 mb-4">
          <p className="text-sm text-white mb-1">{playerNames.join(', ')}</p>
          <p className="text-xs text-gray-400">{new Date(g.created_at).toLocaleDateString('ru-RU')} · до {g.max_score} очков</p>
        </div>

        {game.rounds.map((round, ri) => (
          <div key={round.id} className="bg-white/5 rounded-2xl p-4 mb-3">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Раунд {round.round_number}</span>
              {auth?.initData && editing !== ri && (
                <button onClick={() => startEdit(ri, round)} className="text-xs text-blue-400 hover:text-blue-300">✏️ Редактировать</button>
              )}
              {editing === ri && (
                <div className="flex gap-2">
                  <button onClick={() => handleSave(round)} disabled={saving} className="text-xs text-green-400 hover:text-green-300">{saving ? '...' : 'Сохранить'}</button>
                  <button onClick={() => setEditing(null)} className="text-xs text-gray-400 hover:text-gray-300">Отмена</button>
                </div>
              )}
            </div>

            {round.sets.map(s => {
              const t1 = typeof s.team1_names === 'string' ? JSON.parse(s.team1_names) : s.team1_names
              const t2 = typeof s.team2_names === 'string' ? JSON.parse(s.team2_names) : s.team2_names
              const isEditing = editing === ri
              return (
                <div key={s.id} className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex-1 text-right">
                    <p className="text-xs text-gray-400 truncate">{t1.join(' & ')}</p>
                    {isEditing ? (
                      <input type="number" inputMode="numeric" className="w-12 text-center text-sm font-bold bg-white/10 rounded py-0.5 text-white border border-white/20"
                        value={editScores[s.set_number]?.team1 ?? s.team1_score}
                        onChange={e => setEditScores({ ...editScores, [s.set_number]: { ...editScores[s.set_number], team1: parseInt(e.target.value) || 0 } })}
                      />
                    ) : (
                      <span className="text-sm font-bold text-white">{s.team1_score}</span>
                    )}
                  </div>
                  <span className="text-gray-500 text-xs">:</span>
                  <div className="flex-1 text-left">
                    <p className="text-xs text-gray-400 truncate">{t2.join(' & ')}</p>
                    {isEditing ? (
                      <input type="number" inputMode="numeric" className="w-12 text-center text-sm font-bold bg-white/10 rounded py-0.5 text-white border border-white/20"
                        value={editScores[s.set_number]?.team2 ?? s.team2_score}
                        onChange={e => setEditScores({ ...editScores, [s.set_number]: { ...editScores[s.set_number], team2: parseInt(e.target.value) || 0 } })}
                      />
                    ) : (
                      <span className="text-sm font-bold text-white">{s.team2_score}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function HistoryScreen({ onBack }) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewGameId, setViewGameId] = useState(null)
  const auth = useAuth()

  useEffect(() => {
    if (!auth?.initData) return
    fetch('/api/games', { headers: { 'x-telegram-init-data': auth.initData } })
      .then(r => r.json())
      .then(data => { setGames(data.games || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [auth])

  const handleDelete = async (gameId) => {
    if (!confirm('Удалить эту игру?')) return
    try {
      const r = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE',
        headers: { 'x-telegram-init-data': auth.initData },
      })
      if (r.ok) setGames(games.filter(g => g.id !== gameId))
    } catch {}
  }

  if (viewGameId) {
    return <GameDetailScreen gameId={viewGameId} onBack={() => setViewGameId(null)} />
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-gray-400 hover:text-white text-sm">← Назад</button>
          <h1 className="text-lg font-bold text-white">История игр</h1>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-8">Загрузка...</p>
        ) : games.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Пока нет игр</p>
        ) : (
          <div className="space-y-3">
            {games.map(g => (
              <div key={g.id} className="bg-white/5 rounded-2xl p-4" onClick={() => (g.round_count || 0) > 0 && setViewGameId(g.id)}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400">
                    {new Date(g.created_at).toLocaleDateString('ru-RU')}
                  </span>
                  <div className="flex items-center gap-2">
                    {(g.round_count || 0) === 0 && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(g.id) }}
                        className="text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
                      >Удалить</button>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      g.status === 'finished' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'
                    }`}>{g.status === 'finished' ? 'Завершена' : 'Активна'}</span>
                  </div>
                </div>
                <p className="text-sm text-white mb-1">{(g.player_names || []).join(', ')}</p>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-400">{g.round_count || 0} раунд. · до {g.max_score} очков</p>
                  {(g.round_count || 0) > 0 && <span className="text-xs text-blue-400">Подробнее →</span>}
                </div>
                {g.scores && g.scores.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {g.scores.map((s, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-gray-300">{s.name}</span>
                        <span className="text-green-400 font-mono">{s.total_score}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatsScreen({ onBack }) {
  const [players, setPlayers] = useState([])
  const [selected, setSelected] = useState('')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const auth = useAuth()

  useEffect(() => {
    fetch('/api/stats?list=players')
      .then(r => r.json())
      .then(data => {
        const list = data.players || []
        setPlayers(list)
        const defaultName = auth?.player?.name || ''
        const match = list.find(n => n === defaultName) || list[0] || ''
        setSelected(match)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [auth])

  useEffect(() => {
    if (!selected) return
    setStats(null)
    fetch(`/api/stats?player=${encodeURIComponent(selected)}`)
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {})
  }, [selected])

  const statItems = stats ? [
    { label: 'Всего игр', value: stats.total_games, icon: '🎮' },
    { label: 'Победы', value: stats.wins, icon: '🏆' },
    { label: 'Поражения', value: stats.losses, icon: '💔' },
    { label: 'Процент побед', value: `${stats.win_rate}%`, icon: '📈' },
    { label: 'Забитые мячи', value: stats.total_scored, icon: '⚡' },
    { label: 'Пропущенные', value: stats.total_conceded, icon: '🛡' },
    { label: 'Разница мячей', value: stats.point_diff >= 0 ? `+${stats.point_diff}` : stats.point_diff, icon: '📊' },
    { label: 'Ср. очков за игру', value: stats.avg_score, icon: '📉' },
  ] : []

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-gray-400 hover:text-white text-sm">← Назад</button>
          <h1 className="text-lg font-bold text-white">Статистика</h1>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-8">Загрузка...</p>
        ) : players.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Нет данных</p>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-xs text-gray-400 mb-2">Выберите игрока</p>
              <select
                value={selected}
                onChange={e => setSelected(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white text-base appearance-none"
              >
                {players.map(p => <option key={p} value={p} className="bg-[#1a1a2e] text-white">{p}</option>)}
              </select>
            </div>

            {!stats ? (
              <p className="text-gray-400 text-center py-4">Загрузка...</p>
            ) : (
              <>
                <div className="text-center mb-5">
                  <div className="text-3xl mb-1">👤</div>
                  <p className="text-white font-semibold">{stats.player}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {statItems.map(s => (
                    <div key={s.label} className="bg-white/5 rounded-2xl p-3 text-center">
                      <div className="text-lg mb-1">{s.icon}</div>
                      <p className="text-lg font-bold text-white">{s.value}</p>
                      <p className="text-xs text-gray-400">{s.label}</p>
                    </div>
                  ))}
                </div>

                {stats.recent_games && stats.recent_games.length > 0 && (
                  <>
                    <h2 className="text-sm text-gray-400 uppercase tracking-wider mb-3">Последние игры</h2>
                    <div className="space-y-2">
                      {stats.recent_games.slice(0, 10).map(g => (
                        <div key={g.id} className="bg-white/5 rounded-xl p-3 flex justify-between items-center">
                          <div>
                            <p className="text-xs text-gray-400">{new Date(g.date).toLocaleDateString('ru-RU')}</p>
                            <p className="text-sm text-white">{g.players.join(', ')}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${g.is_winner ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                              {g.is_winner ? 'Победа' : 'Поражение'}
                            </span>
                            <p className="text-xs text-gray-400 mt-1">{g.my_score} очк.</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function App() {
  const [screen, setScreen] = useState('setup')
  const [players, setPlayers] = useState([])
  const [maxScore, setMaxScore] = useState(21)
  const [scores, setScores] = useState({})
  const [roundNum, setRoundNum] = useState(1)
  const [roundHistory, setRoundHistory] = useState([])
  const [auth, setAuth] = useState({ player: null, initData: null })
  const [gameId, setGameId] = useState(null)

  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp
      if (tg) {
        tg.ready()
        tg.expand()
        document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#1a1a2e')
        document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#e0e0e0')
        document.body.style.background = tg.themeParams.bg_color || '#1a1a2e'
        document.body.style.color = tg.themeParams.text_color || '#e0e0e0'

        if (tg.initData) {
          fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData }),
          })
            .then(r => r.json())
            .then(data => {
              if (data.player) setAuth({ player: data.player, initData: tg.initData })
            })
            .catch(() => {})
        }
      }
    } catch {}
  }, [])

  const saveRound = useCallback((gid, roundNumber, roundData) => {
    if (!auth.initData || !gid) return
    const sets = roundData.sets.map((s, i) => ({
      set_number: i + 1,
      team1_names: s.team1,
      team2_names: s.team2,
      team1_score: s.scores?.team1 || 0,
      team2_score: s.scores?.team2 || 0,
    }))
    fetch(`/api/games/${gid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': auth.initData },
      body: JSON.stringify({ action: 'add_round', round_number: roundNumber, sets }),
    }).catch(() => {})
  }, [auth])

  const handleStart = useCallback((names, max) => {
    setPlayers(names)
    setMaxScore(max)
    setScores(Object.fromEntries(names.map(n => [n, 0])))
    setRoundNum(1)
    setRoundHistory([])
    setGameId(null)
    setScreen('game')

    if (auth.initData) {
      fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': auth.initData },
        body: JSON.stringify({ max_score: max, player_names: names }),
      })
        .then(r => r.json())
        .then(data => { if (data.game?.id) setGameId(data.game.id) })
        .catch(() => {})
    }
  }, [auth])

  const handleNewRound = useCallback((currentScores, history) => {
    setScores(currentScores)
    setRoundHistory(history)
    const completedRound = history[history.length - 1]
    if (completedRound) saveRound(gameId, history.length, completedRound)
    setRoundNum(r => r + 1)
  }, [gameId, saveRound])

  const handleFinish = useCallback((finalScores, history) => {
    setScores(finalScores)
    setRoundHistory(history)
    const lastRound = history[history.length - 1]
    const lastSaved = history.length
    if (lastRound && lastRound.sets.some(s => s.scores)) {
      saveRound(gameId, lastSaved, lastRound)
    }
    if (auth.initData && gameId) {
      fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': auth.initData },
        body: JSON.stringify({ action: 'finish', final_scores: finalScores }),
      }).catch(() => {})
    }
    setScreen('results')
  }, [gameId, auth, saveRound])

  const handleNewGame = useCallback(() => {
    setScreen('setup')
    setPlayers([])
    setScores({})
    setRoundNum(1)
    setRoundHistory([])
    setGameId(null)
  }, [])

  return (
    <AuthContext.Provider value={auth}>
      {screen === 'setup' && (
        <SetupScreen
          onStart={handleStart}
          onShowHistory={() => setScreen('history')}
          onShowStats={() => setScreen('stats')}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          players={players} maxScore={maxScore} scores={scores}
          onFinish={handleFinish} roundNum={roundNum}
          onNewRound={handleNewRound} roundHistory={roundHistory}
          gameId={gameId}
        />
      )}
      {screen === 'results' && (
        <ResultsScreen players={players} scores={scores} roundHistory={roundHistory} onNewGame={handleNewGame} />
      )}
      {screen === 'history' && <HistoryScreen onBack={() => setScreen('setup')} />}
      {screen === 'stats' && <StatsScreen onBack={() => setScreen('setup')} />}
    </AuthContext.Provider>
  )
}

export default App
