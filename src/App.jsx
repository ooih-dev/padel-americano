import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import './index.css'

const AuthContext = createContext(null)

function useAuth() {
  return useContext(AuthContext)
}

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

function SetupScreen({ onStart, onShowHistory }) {
  const [names, setNames] = useState(() => {
    try { return JSON.parse(localStorage.getItem('padel_names')) || ['', '', '', ''] }
    catch { return ['', '', '', ''] }
  })
  const [maxScore, setMaxScore] = useState(24)
  const auth = useAuth()

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
    onStart(trimmed, maxScore)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎾</div>
          <h1 className="text-2xl font-bold text-white mb-1">Padel Americano</h1>
          <p className="text-sm text-gray-400">Score Tracker</p>
          {auth?.player && (
            <p className="text-xs text-green-400 mt-1">👤 {auth.player.name}</p>
          )}
        </div>

        <div className="space-y-3 mb-6">
          {names.map((name, i) => (
            <input
              key={i}
              type="text"
              placeholder={`Player ${i + 1}`}
              value={name}
              onChange={e => updateName(i, e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 text-base"
            />
          ))}
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-2 text-center">Points per set</p>
          <div className="flex gap-2 justify-center">
            {[16, 24, 32].map(s => (
              <button
                key={s}
                onClick={() => setMaxScore(s)}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                  maxScore === s
                    ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                    : 'bg-white/10 text-gray-300 hover:bg-white/15'
                }`}
              >
                {s}
              </button>
            ))}
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
        >
          Start Game
        </button>

        {auth?.player && (
          <button
            onClick={onShowHistory}
            className="w-full mt-3 py-3 rounded-xl bg-white/5 text-gray-300 text-sm font-medium hover:bg-white/10 transition-all"
          >
            📋 My Games
          </button>
        )}
      </div>
    </div>
  )
}

function GameScreen({ players, maxScore, scores, onFinish, roundNum, onNewRound, roundHistory }) {
  const [sets, setSets] = useState(() => generateSets(players))
  const [setScores, setSetScores] = useState([null, null, null])
  const [currentSet, setCurrentSet] = useState(0)
  const [localScores, setLocalScores] = useState({ ...scores })
  const [completedSets, setCompletedSets] = useState([])
  const [localRoundHistory, setLocalRoundHistory] = useState(roundHistory)

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
      updatedHistory[roundNum - 1] = { sets: sets.map((st, i) => ({ team1: st.team1, team2: st.team2, scores: null })) }
    }
    updatedHistory[roundNum - 1].sets[setIdx].scores = { team1: s.team1, team2: s.team2 }
    setLocalRoundHistory(updatedHistory)

    if (setIdx < 2) setCurrentSet(setIdx + 1)
  }

  const allDone = completedSets.length === 3

  const leaderboard = players
    .map(p => ({
      name: p,
      score: localScores[p] || 0,
      diff: calcDiff(p, localRoundHistory.filter(Boolean)),
    }))
    .sort((a, b) => b.score - a.score || b.diff - a.diff)

  const startNewRound = () => {
    onNewRound(localScores, localRoundHistory)
    const newSets = generateSets(players)
    setSets(newSets)
    setSetScores([null, null, null])
    setCurrentSet(0)
    setCompletedSets([])
  }

  return (
    <div className="min-h-screen px-4 py-6 pb-32">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-bold text-white">Round {roundNum}</h1>
          <span className="text-xs text-gray-400">
            Set {Math.min(completedSets.length + 1, 3)}/3 · to {maxScore} pts
          </span>
        </div>

        <div className="bg-white/5 rounded-2xl p-4 mb-5">
          <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3">Leaderboard</h2>
          <div className="space-y-2">
            {leaderboard.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    i === 1 ? 'bg-gray-400/20 text-gray-300' :
                    i === 2 ? 'bg-amber-700/20 text-amber-600' :
                    'bg-white/5 text-gray-500'
                  }`}>
                    {i + 1}
                  </span>
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
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Set {idx + 1}</span>
                  {done && <span className="text-xs text-green-400">✓</span>}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 text-center">
                    <p className="text-xs text-gray-400 mb-1">
                      {set.team1[0]} & {set.team1[1]}
                    </p>
                    {done ? (
                      <span className="text-xl font-bold text-white">{setScores[idx]?.team1}</span>
                    ) : active ? (
                      <input
                        type="number"
                        min="0"
                        max={maxScore}
                        placeholder="0"
                        value={setScores[idx]?.team1 ?? ''}
                        onChange={e => handleScore(idx, parseInt(e.target.value) || 0)}
                        className="w-16 mx-auto text-center text-xl font-bold bg-white/10 rounded-lg py-1.5 text-white border border-white/10"
                        inputMode="numeric"
                      />
                    ) : (
                      <span className="text-xl text-gray-600">—</span>
                    )}
                  </div>

                  <span className="text-gray-500 text-sm font-bold">vs</span>

                  <div className="flex-1 text-center">
                    <p className="text-xs text-gray-400 mb-1">
                      {set.team2[0]} & {set.team2[1]}
                    </p>
                    {done ? (
                      <span className="text-xl font-bold text-white">{setScores[idx]?.team2}</span>
                    ) : active && setScores[idx] !== null ? (
                      <span className="text-xl font-bold text-green-400">{setScores[idx]?.team2}</span>
                    ) : (
                      <span className="text-xl text-gray-600">—</span>
                    )}
                  </div>
                </div>

                {active && !done && setScores[idx] !== null && (
                  <button
                    onClick={() => confirmSet(idx)}
                    className="w-full mt-3 py-2 rounded-xl bg-green-600 text-white text-sm font-medium active:scale-[0.98] transition-transform"
                  >
                    Confirm
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {allDone && (
          <div className="mt-6 space-y-3">
            <button
              onClick={startNewRound}
              className="w-full py-3 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/15 transition-all"
            >
              Next Round →
            </button>
            <button
              onClick={() => onFinish(localScores, localRoundHistory)}
              className="w-full py-3 rounded-xl bg-green-600 text-white text-sm font-semibold shadow-lg shadow-green-600/30 active:scale-[0.98] transition-all"
            >
              Finish Game
            </button>
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

  const shareText = `🎾 Padel Americano Results\n${leaderboard.map((p, i) =>
    `${medals[Math.min(i, 3)]} ${p.name} — ${p.score} pts (${p.diff >= 0 ? '+' : ''}${p.diff})`
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
          <h1 className="text-2xl font-bold text-white mb-1">Final Results</h1>
          <p className="text-xs text-gray-400">{roundHistory.filter(Boolean).length} round(s) played</p>
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
                  <p className="text-xs text-gray-400">
                    diff: {p.diff >= 0 ? '+' : ''}{p.diff}
                  </p>
                </div>
              </div>
              <span className="text-2xl font-mono font-bold text-green-400">{p.score}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleShare}
            className="w-full py-3 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/15 transition-all"
          >
            {shared ? '✓ Copied!' : '📤 Share Results'}
          </button>
          <button
            onClick={onNewGame}
            className="w-full py-3.5 rounded-xl bg-green-600 text-white text-base font-semibold shadow-lg shadow-green-600/30 active:scale-[0.98] transition-all"
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  )
}

function HistoryScreen({ onBack }) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const auth = useAuth()

  useEffect(() => {
    if (!auth?.initData) return
    fetch('/api/games', {
      headers: { 'x-telegram-init-data': auth.initData }
    })
      .then(r => r.json())
      .then(data => { setGames(data.games || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [auth])

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-gray-400 hover:text-white text-sm">← Back</button>
          <h1 className="text-lg font-bold text-white">My Games</h1>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-8">Loading...</p>
        ) : games.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No games yet</p>
        ) : (
          <div className="space-y-3">
            {games.map(g => (
              <div key={g.id} className="bg-white/5 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400">
                    {new Date(g.created_at).toLocaleDateString()}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    g.status === 'finished' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'
                  }`}>
                    {g.status === 'finished' ? 'Done' : 'Active'}
                  </span>
                </div>
                <p className="text-sm text-white mb-1">
                  {(g.player_names || []).join(', ')}
                </p>
                <p className="text-xs text-gray-400">
                  {g.round_count || 0} rounds · to {g.max_score} pts
                </p>
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

function App() {
  const [screen, setScreen] = useState('setup')
  const [players, setPlayers] = useState([])
  const [maxScore, setMaxScore] = useState(24)
  const [scores, setScores] = useState({})
  const [roundNum, setRoundNum] = useState(1)
  const [roundHistory, setRoundHistory] = useState([])
  const [auth, setAuth] = useState({ player: null, initData: null })

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
              if (data.player) {
                setAuth({ player: data.player, initData: tg.initData })
              }
            })
            .catch(() => {})
        }
      }
    } catch {}
  }, [])

  const handleStart = useCallback((names, max) => {
    setPlayers(names)
    setMaxScore(max)
    setScores(Object.fromEntries(names.map(n => [n, 0])))
    setRoundNum(1)
    setRoundHistory([])
    setScreen('game')

    if (auth.initData) {
      fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': auth.initData,
        },
        body: JSON.stringify({ max_score: max, player_names: names }),
      }).catch(() => {})
    }
  }, [auth])

  const handleNewRound = useCallback((currentScores, history) => {
    setScores(currentScores)
    setRoundHistory(history)
    setRoundNum(r => r + 1)
  }, [])

  const handleFinish = useCallback((finalScores, history) => {
    setScores(finalScores)
    setRoundHistory(history)
    setScreen('results')
  }, [])

  const handleNewGame = useCallback(() => {
    setScreen('setup')
    setPlayers([])
    setScores({})
    setRoundNum(1)
    setRoundHistory([])
  }, [])

  return (
    <AuthContext.Provider value={auth}>
      {screen === 'setup' && (
        <SetupScreen onStart={handleStart} onShowHistory={() => setScreen('history')} />
      )}
      {screen === 'game' && (
        <GameScreen
          players={players}
          maxScore={maxScore}
          scores={scores}
          onFinish={handleFinish}
          roundNum={roundNum}
          onNewRound={handleNewRound}
          roundHistory={roundHistory}
        />
      )}
      {screen === 'results' && (
        <ResultsScreen
          players={players}
          scores={scores}
          roundHistory={roundHistory}
          onNewGame={handleNewGame}
        />
      )}
      {screen === 'history' && (
        <HistoryScreen onBack={() => setScreen('setup')} />
      )}
    </AuthContext.Provider>
  )
}

export default App
