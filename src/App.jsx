import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import allQuestions from './data/questions.json'
import './App.css'

const QUESTION_COUNT = 30

const RATINGS = [
  { max: 20, label: 'Muggle', description: 'You clearly wandered in from the wrong platform.' },
  { max: 40, label: 'First Year', description: 'You know the basics, but the real magic eludes you.' },
  { max: 60, label: 'O.W.L. Student', description: 'Respectable knowledge. Professor McGonagall would give a curt nod.' },
  { max: 80, label: 'Auror-Level', description: 'Impressive. You could hold your own in the Department of Mysteries.' },
  { max: 100, label: 'You ARE J.K. Rowling', description: 'There is nothing in these books you do not know.' },
]

function shuffleArray(arr) {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function getRating(percentage) {
  return RATINGS.find(r => percentage <= r.max) || RATINGS[RATINGS.length - 1]
}

// --- Fuzzy matching ---

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function normalize(str) {
  return str.toLowerCase().trim().replace(/['']/g, "'").replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ')
}

function fuzzyMatch(input, target) {
  const a = normalize(input)
  const b = normalize(target)
  if (!a) return false

  // Exact match after normalization
  if (a === b) return true

  // Containment: input contains the target or vice versa
  if (a.includes(b) || b.includes(a)) return true

  // Levenshtein with threshold scaled to answer length
  const maxLen = Math.max(a.length, b.length)
  const dist = levenshtein(a, b)
  const threshold = maxLen <= 4 ? 1 : Math.floor(maxLen * 0.3)
  return dist <= threshold
}

function checkAnswer(input, question) {
  const candidates = [question.answer, ...question.acceptedAnswers]
  return candidates.some(candidate => fuzzyMatch(input, candidate))
}

// --- Components ---

function Stars() {
  const stars = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: `${3 + Math.random() * 4}s`,
      delay: `${Math.random() * 5}s`,
      maxOpacity: 0.15 + Math.random() * 0.25,
    }))
  }, [])

  return (
    <div className="stars">
      {stars.map(s => (
        <div
          key={s.id}
          className="star"
          style={{
            left: s.left,
            top: s.top,
            '--duration': s.duration,
            '--delay': s.delay,
            '--max-opacity': s.maxOpacity,
          }}
        />
      ))}
    </div>
  )
}

function StartScreen({ onStart, questionCount }) {
  return (
    <div className="start-screen">
      <div>
        <h1 className="start-screen__title">Ultra Obscure<br />Harry Potter Trivia</h1>
        <p className="start-screen__subtitle">For the truly devoted reader</p>
      </div>

      <div className="start-screen__divider" />

      <p className="start-screen__description">
        No movie moments. No pub quiz fodder. Only details mentioned once,
        hidden in throwaway lines, and buried in the margins of all seven books.
      </p>

      <div className="start-screen__wand" />

      <div className="start-screen__info">
        <span>{questionCount} questions</span>
        <span>Free response</span>
      </div>

      <button className="btn" onClick={onStart}>
        I Solemnly Swear
      </button>
    </div>
  )
}

function QuizHeader({ current, total, score }) {
  const progress = ((current) / total) * 100
  return (
    <div>
      <div className="quiz-header">
        <div className="quiz-header__progress">
          Question {current + 1} of {total}
        </div>
        <div className="quiz-header__score">
          Score: {score} / {current}
        </div>
      </div>
      <div className="progress-bar">
        <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

function Question({ question, onAnswer, answered, lastResult, onNext }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    setInput('')
    if (inputRef.current) inputRef.current.focus()
  }, [question.id])

  useEffect(() => {
    if (!answered) return
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [answered, onNext])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (answered || !input.trim()) return
    onAnswer(input.trim())
  }

  return (
    <div className="question-container" key={question.id}>
      <span className="category-badge">{question.category}</span>
      <h2 className="question-text">{question.question}</h2>

      <form className="answer-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className={`answer-input ${answered ? (lastResult?.correct ? 'answer-input--correct' : 'answer-input--incorrect') : ''}`}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your answer..."
          disabled={answered}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        {!answered && (
          <button className="btn btn--submit" type="submit" disabled={!input.trim()}>
            Submit
          </button>
        )}
      </form>

      {answered && lastResult && (
        <div className={`feedback ${lastResult.correct ? 'feedback--correct' : 'feedback--incorrect'}`}>
          <div className="feedback__label">
            {lastResult.correct ? 'Correct' : 'Incorrect'}
          </div>
          {!lastResult.correct && (
            <div className="feedback__your-answer">
              You answered: <span>{lastResult.input}</span>
            </div>
          )}
          <div className="feedback__answer">
            Answer: {question.answer}
          </div>
          <div className="feedback__source">{question.source}</div>
        </div>
      )}
    </div>
  )
}

function EndScreen({ score, total, questions, answers, onRestart }) {
  const percentage = Math.round((score / total) * 100)
  const rating = getRating(percentage)

  const categoryBreakdown = useMemo(() => {
    const cats = {}
    questions.forEach((q, i) => {
      if (!cats[q.category]) cats[q.category] = { correct: 0, total: 0 }
      cats[q.category].total++
      if (answers[i]?.correct) cats[q.category].correct++
    })
    return Object.entries(cats).sort((a, b) => a[0].localeCompare(b[0]))
  }, [questions, answers])

  return (
    <div className="end-screen">
      <div className="end-screen__rating-label">Your Ranking</div>
      <div className="end-screen__rating">{rating.label}</div>
      <p className="start-screen__description">{rating.description}</p>

      <div className="end-screen__divider" />

      <div className="end-screen__score-display">
        {score} <span>/ {total}</span>
      </div>
      <div className="end-screen__percentage">{percentage}% correct</div>

      <div className="end-screen__divider" />

      <div className="end-screen__breakdown">
        <div className="end-screen__breakdown-title">By Category</div>
        {categoryBreakdown.map(([cat, data]) => (
          <div key={cat} className="breakdown-row">
            <span className="breakdown-row__category">{cat}</span>
            <span className="breakdown-row__score">
              {data.correct} / {data.total}
            </span>
          </div>
        ))}
      </div>

      <div className="end-screen__buttons">
        <button className="btn" onClick={onRestart}>
          Play Again
        </button>
      </div>
    </div>
  )
}

function App() {
  const [gameState, setGameState] = useState('start')
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [answers, setAnswers] = useState([])
  const [lastResult, setLastResult] = useState(null)

  const startGame = useCallback(() => {
    const shuffled = shuffleArray(allQuestions).slice(0, QUESTION_COUNT)
    setQuestions(shuffled)
    setCurrentIndex(0)
    setScore(0)
    setAnswered(false)
    setAnswers([])
    setLastResult(null)
    setGameState('playing')
  }, [])

  const handleAnswer = useCallback((input) => {
    if (answered) return
    const isCorrect = checkAnswer(input, questions[currentIndex])
    const result = { input, correct: isCorrect }
    setLastResult(result)
    setAnswered(true)
    if (isCorrect) setScore(s => s + 1)
    setAnswers(prev => [...prev, result])
  }, [answered, questions, currentIndex])

  const nextQuestion = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      setGameState('ended')
    } else {
      setCurrentIndex(i => i + 1)
      setAnswered(false)
      setLastResult(null)
    }
  }, [currentIndex, questions.length])

  return (
    <>
      <Stars />
      <div className="app">
        {gameState === 'start' && (
          <StartScreen onStart={startGame} questionCount={QUESTION_COUNT} />
        )}

        {gameState === 'playing' && questions.length > 0 && (
          <>
            <QuizHeader
              current={currentIndex}
              total={questions.length}
              score={score}
            />
            <Question
              question={questions[currentIndex]}
              onAnswer={handleAnswer}
              answered={answered}
              lastResult={lastResult}
              onNext={nextQuestion}
            />
            {answered && (
              <div className="feedback__next">
                <button className="btn btn--small" onClick={nextQuestion}>
                  {currentIndex + 1 >= questions.length ? 'See Results' : 'Next Question'}
                </button>
              </div>
            )}
          </>
        )}

        {gameState === 'ended' && (
          <EndScreen
            score={score}
            total={questions.length}
            questions={questions}
            answers={answers}
            onRestart={startGame}
          />
        )}
      </div>
    </>
  )
}

export default App
