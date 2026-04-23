import { useState, useEffect, useCallback } from 'react'
import './index.css'

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

function SetupScreen({ onStart }) {
  const [names, setNames] = useState(['', '', '', ''])
  const [maxScore, setMaxScore] = useState(16)

  const updateName = (i, val) => {
    const n = [...names]
    n[i] = val
    setNames(n)
  }

  const canStart = names.every(n => n.trim().length > 0)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎾</div>
          <h1 className="text-2xl font-bold text-white mb-1">Padel Americano</h1>
          <p className="text-sm text-gray-400">Score Tracker</p>
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
            {[16, 21, 32].map(s => (
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
          onClick={() => canStart && onStart(names.map(n => n.trim()), maxScore)}
          disabled={!canStart}
          className={`w-full py-3.5 rounded-xl text-base font-semibold transition-all ${
            canStart
              ? 'bg-green-600 text-white shadow-lg shadow-green-600/30 active:scale-[0.98]'
              : 'bg-white/5 text-gray-600 cursor-not-allowed'
          }`}
        >
          Start Game
        </button>
      </div>
    </div>
  )
}

function GameScreen({ players, maxScore, scores, onFinish, roundNum, onNewRound }) {
  const [sets, setSets] = useState(() => generateSets(players))
  const [setScores, setSetScores] = useState([null, null, null])
  const [currentSet, setCurrentSet] = useState(0)
  const [localScores, setLocalScores] = useState({ ...scores })
  const [completedSets, setCompletedSets] = useState([])

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
    setCompletedSets([...completedSets, setIdx])
    if (setIdx < 2) setCurrentSet(setIdx + 1)
  }

  const allDone = completedSets.length === 3

  const leaderboard = players
    .map(p => ({ name: p, score: localScores[p] || 0 }))
    .sort((a, b) => b.score - a.score)

  const startNewRound = () => {
    onNewRound(localScores)
    setSets(generateSets(players))
    setSetScores([null, null, null])
    setCurrentSet(0)
    setCompletedSets([])
  }

  return (
    <div className="min-h-screen px-4 py-6 pb-32">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-bold text-white">Round {roundNum}</h1>
          <span className="text-xs text-gray-400">to {maxScore} pts</span>
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
                <span className="text-sm font-mono font-bold text-green-400">{p.score}</span>
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
              onClick={() => onFinish(localScores)}
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

function ResultsScreen({ players, scores, onNewGame }) {
  const leaderboard = players
    .map(p => ({ name: p, score: scores[p] || 0 }))
    .sort((a, b) => b.score - a.score)

  const medals = ['🥇', '🥈', '🥉', '']
  const colors = [
    'from-yellow-500/20 to-yellow-600/5 border-yellow-500/30',
    'from-gray-400/20 to-gray-500/5 border-gray-400/30',
    'from-amber-700/20 to-amber-800/5 border-amber-600/30',
    'from-white/5 to-white/0 border-white/10',
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-2xl font-bold text-white mb-1">Final Results</h1>
        </div>

        <div className="space-y-3 mb-8">
          {leaderboard.map((p, i) => (
            <div
              key={p.name}
              className={`flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r border ${colors[Math.min(i, 3)]}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl w-8">{medals[Math.min(i, 3)]}</span>
                <div className="text-left">
                  <p className="text-white font-semibold">{p.name}</p>
                  <p className="text-xs text-gray-400">#{i + 1}</p>
                </div>
              </div>
              <span className="text-2xl font-mono font-bold text-green-400">{p.score}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onNewGame}
          className="w-full py-3.5 rounded-xl bg-green-600 text-white text-base font-semibold shadow-lg shadow-green-600/30 active:scale-[0.98] transition-all"
        >
          New Game
        </button>
      </div>
    </div>
  )
}

function App() {
  const [screen, setScreen] = useState('setup')
  const [players, setPlayers] = useState([])
  const [maxScore, setMaxScore] = useState(16)
  const [scores, setScores] = useState({})
  const [roundNum, setRoundNum] = useState(1)

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
      }
    } catch {}
  }, [])

  const handleStart = useCallback((names, max) => {
    setPlayers(names)
    setMaxScore(max)
    setScores(Object.fromEntries(names.map(n => [n, 0])))
    setRoundNum(1)
    setScreen('game')
  }, [])

  const handleNewRound = useCallback((currentScores) => {
    setScores(currentScores)
    setRoundNum(r => r + 1)
  }, [])

  const handleFinish = useCallback((finalScores) => {
    setScores(finalScores)
    setScreen('results')
  }, [])

  const handleNewGame = useCallback(() => {
    setScreen('setup')
    setPlayers([])
    setScores({})
    setRoundNum(1)
  }, [])

  if (screen === 'setup') {
    return <SetupScreen onStart={handleStart} />
  }

  if (screen === 'game') {
    return (
      <GameScreen
        players={players}
        maxScore={maxScore}
        scores={scores}
        onFinish={handleFinish}
        roundNum={roundNum}
        onNewRound={handleNewRound}
      />
    )
  }

  return (
    <ResultsScreen
      players={players}
      scores={scores}
      onNewGame={handleNewGame}
    />
  )
}

export default App
