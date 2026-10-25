import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES, DEFAULT_FOODS, GOAL, REACTIONS, reactionOf } from './foods.js'
import { useStore, uid, today, dayLabel, byNewest, download, normalizeImport, EMPTY_STATE } from './store.js'

const TABS = [
  { id: 'foods', label: 'Foods', emoji: '🥄' },
  { id: 'journal', label: 'Journal', emoji: '📖' },
  { id: 'settings', label: 'Settings', emoji: '⚙️' },
]

const catOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1]

export default function App() {
  const [state, setState] = useStore()
  const [tab, setTab] = useState(() => location.hash.slice(1) || 'foods')
  const [openFood, setOpenFood] = useState(null) // food id
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState(null) // { text, undo? }

  useEffect(() => {
    const onHash = () => setTab(location.hash.slice(1) || 'foods')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.undo ? 4500 : 2400)
    return () => clearTimeout(t)
  }, [toast])

  const foods = useMemo(() => [...DEFAULT_FOODS, ...state.customFoods], [state.customFoods])
  const foodById = useMemo(() => Object.fromEntries(foods.map((f) => [f.id, f])), [foods])

  // Tries grouped per food, newest first, plus the id of each food's very first try
  const { triesByFood, firstTryIds } = useMemo(() => {
    const m = {}
    for (const t of state.tries) (m[t.foodId] ||= []).push(t)
    const first = new Set()
    for (const list of Object.values(m)) {
      list.sort(byNewest)
      first.add(list[list.length - 1].id)
    }
    return { triesByFood: m, firstTryIds: first }
  }, [state.tries])

  const triedCount = foods.filter((f) => triesByFood[f.id]).length
  const name = state.babyName.trim()

  const go = (id) => {
    location.hash = id
    window.scrollTo(0, 0)
  }

  const addTry = (foodId, fields = {}) => {
    const isNew = !triesByFood[foodId]
    const t = { id: uid(), foodId, date: today(), reaction: '', comment: '', createdAt: Date.now(), ...fields }
    setState((s) => ({ ...s, tries: [...s.tries, t] }))
    return { t, isNew }
  }

  const quickTally = (food) => {
    const { t, isNew } = addTry(food.id)
    setToast({
      text: isNew ? `🎉 New food! ${food.name} · ${triedCount + 1}/${GOAL}` : `+1 ${food.name}`,
      undo: () => setState((s) => ({ ...s, tries: s.tries.filter((x) => x.id !== t.id) })),
    })
  }

  const updateTry = (t) => setState((s) => ({ ...s, tries: s.tries.map((x) => (x.id === t.id ? t : x)) }))
  const deleteTry = (id) => setState((s) => ({ ...s, tries: s.tries.filter((x) => x.id !== id) }))

  return (
    <div className="app">
      <header className="topbar">
        <h1>{tab === 'foods' ? (name ? `${name}'s first foods` : 'First 100 foods') : TABS.find((t) => t.id === tab)?.label}</h1>
      </header>

      <main>
        {tab === 'journal' ? (
          <Journal tries={state.tries} foodById={foodById} firstTryIds={firstTryIds} onOpen={setOpenFood} />
        ) : tab === 'settings' ? (
          <Settings
            state={state}
            onName={(babyName) => setState((s) => ({ ...s, babyName }))}
            onReplace={(next, msg) => {
              setState(next)
              setToast({ text: msg })
            }}
            notify={(text) => setToast({ text })}
          />
        ) : (
          <Foods
            foods={foods}
            triesByFood={triesByFood}
            triedCount={triedCount}
            name={name}
            onOpen={setOpenFood}
            onTally={quickTally}
            onAddFood={() => setAdding(true)}
          />
        )}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => go(t.id)} aria-current={tab === t.id}>
            <span className="tab-emoji" aria-hidden="true">{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {openFood && foodById[openFood] && (
        <FoodSheet
          food={foodById[openFood]}
          tries={triesByFood[openFood] || []}
          onAdd={(fields) => {
            const { isNew } = addTry(openFood, fields)
            setToast({ text: isNew ? `🎉 New food! ${triedCount + 1}/${GOAL}` : 'Try logged' })
          }}
          onUpdate={updateTry}
          onDeleteTry={deleteTry}
          onDeleteFood={() => {
            setState((s) => ({
              ...s,
              customFoods: s.customFoods.filter((f) => f.id !== openFood),
              tries: s.tries.filter((t) => t.foodId !== openFood),
            }))
            setOpenFood(null)
            setToast({ text: 'Food removed' })
          }}
          onClose={() => setOpenFood(null)}
        />
      )}

      {adding && (
        <AddFoodSheet
          foods={foods}
          onSave={(food) => {
            setState((s) => ({ ...s, customFoods: [...s.customFoods, food] }))
            setAdding(false)
            setOpenFood(food.id)
          }}
          onClose={() => setAdding(false)}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          {toast.undo && (
            <button onClick={() => { toast.undo(); setToast(null) }}>Undo</button>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------- Foods ---------- */

function Foods({ foods, triesByFood, triedCount, name, onOpen, onTally, onAddFood }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const filters = [
    ['all', 'All'],
    ['todo', 'Not yet'],
    ['tried', 'Tried'],
    ['allergen', 'Allergens'],
    ...CATEGORIES.filter((c) => c.id !== 'other' || foods.some((f) => f.cat === 'other')).map((c) => [c.id, `${c.emoji} ${c.label}`]),
  ]

  const q = query.trim().toLowerCase()
  const shown = foods.filter((f) => {
    if (q && !f.name.toLowerCase().includes(q)) return false
    if (filter === 'todo') return !triesByFood[f.id]
    if (filter === 'tried') return !!triesByFood[f.id]
    if (filter === 'allergen') return !!f.allergen
    if (filter !== 'all') return f.cat === filter
    return true
  })

  const groups = CATEGORIES.map((c) => [c, shown.filter((f) => f.cat === c.id)]).filter(([, list]) => list.length)

  return (
    <>
      <Progress tried={triedCount} name={name} />

      <div className="toolbar">
        <input className="search" type="search" placeholder="Search foods" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn primary" onClick={onAddFood}>+ Food</button>
      </div>
      <div className="chips">
        {filters.map(([id, label]) => (
          <button key={id} className={filter === id ? 'chip on' : 'chip'} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>

      {groups.length === 0 && (
        <section className="card">
          <p className="empty">
            {q ? `No “${query}” on the list yet.` : 'Nothing here.'}{' '}
            {q && <button className="link" onClick={onAddFood}>Add it as a new food</button>}
          </p>
        </section>
      )}

      {groups.map(([cat, list]) => {
        const done = list.filter((f) => triesByFood[f.id]).length
        return (
          <section className="card" key={cat.id}>
            <div className="row-between">
              <h2>{cat.emoji} {cat.label}</h2>
              <span className="muted small">{done}/{list.length}</span>
            </div>
            <ul className="foods">
              {list.map((f) => {
                const tries = triesByFood[f.id] || []
                const last = tries[0] && reactionOf(tries[0].reaction)
                return (
                  <li key={f.id} className={tries.length ? 'tried' : ''}>
                    <button className="food" onClick={() => onOpen(f.id)}>
                      <span className="food-emoji" aria-hidden="true">{f.emoji}</span>
                      <span className="food-main">
                        <span className="food-name">
                          {f.name}
                          {f.allergen && <span className="allergen" title={`Common allergen: ${f.allergen}`}>{f.allergen}</span>}
                        </span>
                        {tries.length ? (
                          <span className="food-meta">
                            <Tally n={tries.length} />
                            {last && <span aria-label={last.label}>{last.emoji}</span>}
                          </span>
                        ) : (
                          <span className="food-meta muted">Not tried yet</span>
                        )}
                      </span>
                    </button>
                    <button className="plus" onClick={() => onTally(f)} aria-label={`Log a try of ${f.name}`}>
                      {tries.length ? '+1' : 'Try'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </>
  )
}

function Progress({ tried, name }) {
  const pct = Math.min(1, tried / GOAL)
  const r = 44
  const c = 2 * Math.PI * r
  const left = Math.max(0, GOAL - tried)
  return (
    <section className="card progress">
      <svg viewBox="0 0 100 100" className="ring" role="img" aria-label={`${tried} of ${GOAL} foods tried`}>
        <circle cx="50" cy="50" r={r} className="ring-bg" />
        <circle cx="50" cy="50" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
        <text x="50" y="49" textAnchor="middle" className="ring-num">{tried}</text>
        <text x="50" y="65" textAnchor="middle" className="ring-sub">of {GOAL}</text>
      </svg>
      <div>
        <p className="progress-title">
          {tried === 0 ? 'Let’s start tasting!' : left === 0 ? '🎉 100 foods!' : `${left} to go`}
        </p>
        <p className="muted small">
          {tried === 0
            ? `Tap “Try” when ${name || 'baby'} tastes something new. Tap again each time it comes back.`
            : left === 0
              ? `${name || 'Baby'} reached the goal. Keep counting!`
              : `${Math.round(pct * 100)}% of the way there.`}
        </p>
      </div>
    </section>
  )
}

// Classic tally marks: groups of four strokes with a slash for five
function Tally({ n }) {
  const groups = Math.floor(n / 5)
  const rest = n % 5
  if (n > 25) return <span className="tally-count">×{n}</span>
  return (
    <span className="tally" aria-label={`${n} ${n === 1 ? 'try' : 'tries'}`}>
      {Array.from({ length: groups }, (_, i) => (
        <svg key={i} viewBox="0 0 26 16" width="26" height="16" aria-hidden="true">
          {[3, 8, 13, 18].map((x) => <line key={x} x1={x} y1="1" x2={x} y2="15" />)}
          <line x1="0" y1="13" x2="22" y2="3" />
        </svg>
      ))}
      {rest > 0 && (
        <svg viewBox={`0 0 ${rest * 5 + 1} 16`} width={rest * 5 + 1} height="16" aria-hidden="true">
          {Array.from({ length: rest }, (_, i) => <line key={i} x1={i * 5 + 3} y1="1" x2={i * 5 + 3} y2="15" />)}
        </svg>
      )}
      <span className="tally-num">{n}</span>
    </span>
  )
}

/* ---------- Food detail ---------- */

function Sheet({ onClose, children, label }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {children}
      </div>
    </div>
  )
}

function FoodSheet({ food, tries, onAdd, onUpdate, onDeleteTry, onDeleteFood, onClose }) {
  const [editing, setEditing] = useState(null) // try being edited
  const first = tries[tries.length - 1]
  const counts = REACTIONS.map((r) => [r, tries.filter((t) => t.reaction === r.id).length]).filter(([, n]) => n)

  return (
    <Sheet onClose={onClose} label={food.name}>
      <div className="row-between">
        <span className="muted small">{catOf(food.cat).emoji} {catOf(food.cat).label}</span>
        <button className="link" onClick={onClose}>Done</button>
      </div>
      <div className="food-hero">
        <span className="food-hero-emoji" aria-hidden="true">{food.emoji}</span>
        <div>
          <h2>{food.name}</h2>
          <p className="muted small">
            {tries.length
              ? `Tried ${tries.length} ${tries.length === 1 ? 'time' : 'times'} · first on ${dayLabel(first.date)}`
              : 'Not tried yet'}
          </p>
        </div>
      </div>
      {tries.length > 0 && (
        <div className="tally-big">
          <Tally n={tries.length} />
          {counts.length > 0 && (
            <span className="reaction-summary">
              {counts.map(([r, n]) => <span key={r.id} title={r.label}>{r.emoji}{n > 1 ? `×${n}` : ''}</span>)}
            </span>
          )}
        </div>
      )}
      {food.allergen && (
        <p className="note">
          <strong>Common allergen ({food.allergen}).</strong> Offer it early in the day and watch for hives, swelling, vomiting or trouble breathing. Follow your pediatrician’s advice on introducing allergens.
        </p>
      )}

      <TryForm
        key={editing?.id || 'new'}
        initial={editing}
        isFirst={!tries.length}
        onSubmit={(fields) => {
          if (editing) onUpdate({ ...editing, ...fields })
          else onAdd(fields)
          setEditing(null)
        }}
        onCancel={editing ? () => setEditing(null) : null}
      />

      {tries.length > 0 && (
        <section className="history">
          <h3>History &amp; comments</h3>
          <ul>
            {tries.map((t) => {
              const r = reactionOf(t.reaction)
              return (
                <li key={t.id} className={editing?.id === t.id ? 'editing' : ''}>
                  <div className="row-between">
                    <span className="history-date">
                      {dayLabel(t.date)}
                      {t.id === first.id && <span className="badge">First try</span>}
                    </span>
                    <span className="history-actions">
                      <button className="link" onClick={() => setEditing(t)}>Edit</button>
                      <button className="link danger" onClick={() => confirm('Delete this entry?') && onDeleteTry(t.id)}>Delete</button>
                    </span>
                  </div>
                  {r && <span className="history-reaction">{r.emoji} {r.label}</span>}
                  {t.comment && <p className="comment">{t.comment}</p>}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {food.custom && (
        <button className="btn danger" onClick={() => confirm(`Remove ${food.name} and its history?`) && onDeleteFood()}>
          Remove this food
        </button>
      )}
    </Sheet>
  )
}

function TryForm({ initial, isFirst, onSubmit, onCancel }) {
  const [date, setDate] = useState(initial?.date || today())
  const [reaction, setReaction] = useState(initial?.reaction || '')
  const [comment, setComment] = useState(initial?.comment || '')

  const submit = (e) => {
    e.preventDefault()
    onSubmit({ date, reaction, comment: comment.trim() })
    if (!initial) {
      setReaction('')
      setComment('')
    }
  }

  return (
    <form className="try-form" onSubmit={submit}>
      <h3>{initial ? 'Edit entry' : isFirst ? 'First taste' : 'Tried it again'}</h3>
      <div className="reactions" role="radiogroup" aria-label="How did it go?">
        {REACTIONS.map((r) => (
          <button type="button" key={r.id} role="radio" aria-checked={reaction === r.id}
            className={reaction === r.id ? 'on' : ''} onClick={() => setReaction(reaction === r.id ? '' : r.id)}>
            <span className="r-emoji">{r.emoji}</span>
            <span className="r-label">{r.label}</span>
          </button>
        ))}
      </div>
      <label className="field">
        <span>Comment</span>
        <textarea rows="3" value={comment} onChange={(e) => setComment(e.target.value)}
          placeholder="How was it served? Faces, mess, how much he ate…" />
      </label>
      <label className="field inline">
        <span>Date</span>
        <input type="date" required value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
      </label>
      <button className="btn primary big" type="submit">
        {initial ? 'Save changes' : isFirst ? 'Log first try 🎉' : 'Add tally +1'}
      </button>
      {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel edit</button>}
    </form>
  )
}

function AddFoodSheet({ foods, onSave, onClose }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [cat, setCat] = useState('other')
  const [allergen, setAllergen] = useState('')
  const dupe = foods.find((f) => f.name.toLowerCase() === name.trim().toLowerCase())

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim() || dupe) return
    onSave({
      id: 'c-' + uid(),
      name: name.trim(),
      emoji: emoji.trim() || catOf(cat).emoji,
      cat,
      allergen: allergen.trim(),
      custom: true,
    })
  }

  return (
    <Sheet onClose={onClose} label="Add a food">
      <form className="stack" onSubmit={submit}>
        <div className="row-between">
          <h2>Add a food</h2>
          <button type="button" className="link" onClick={onClose}>Cancel</button>
        </div>
        <div className="emoji-name">
          <label className="field">
            <span>Emoji</span>
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder={catOf(cat).emoji} maxLength={4} />
          </label>
          <label className="field">
            <span>Food</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dragon fruit" required autoFocus />
          </label>
        </div>
        {dupe && <p className="error">{dupe.name} is already on the list.</p>}
        <label className="field">
          <span>Category</span>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Allergen <em>(optional)</em></span>
          <input value={allergen} onChange={(e) => setAllergen(e.target.value)} placeholder="e.g. Tree nut" />
        </label>
        <button className="btn primary big" type="submit" disabled={!name.trim() || !!dupe}>Add food</button>
      </form>
    </Sheet>
  )
}

/* ---------- Journal ---------- */

function Journal({ tries, foodById, firstTryIds, onOpen }) {
  const [onlyComments, setOnlyComments] = useState(false)
  const list = [...tries].filter((t) => foodById[t.foodId] && (!onlyComments || t.comment)).sort(byNewest)
  const days = []
  for (const t of list) {
    if (days.length && days[days.length - 1][0] === t.date) days[days.length - 1][1].push(t)
    else days.push([t.date, [t]])
  }

  return (
    <>
      <div className="chips">
        <button className={!onlyComments ? 'chip on' : 'chip'} onClick={() => setOnlyComments(false)}>All entries</button>
        <button className={onlyComments ? 'chip on' : 'chip'} onClick={() => setOnlyComments(true)}>With comments</button>
      </div>
      {days.length === 0 ? (
        <section className="card">
          <p className="empty">{tries.length ? 'No entries with comments yet.' : 'Every try you log shows up here, newest first.'}</p>
        </section>
      ) : (
        days.map(([date, items]) => (
          <section className="card" key={date}>
            <div className="row-between">
              <h2>{dayLabel(date)}</h2>
              <span className="muted small">{items.length} {items.length === 1 ? 'food' : 'foods'}</span>
            </div>
            <ul className="journal">
              {items.map((t) => {
                const f = foodById[t.foodId]
                const r = reactionOf(t.reaction)
                return (
                  <li key={t.id}>
                    <button onClick={() => onOpen(f.id)}>
                      <span className="food-emoji" aria-hidden="true">{f.emoji}</span>
                      <span className="food-main">
                        <span className="food-name">
                          {f.name}
                          {firstTryIds.has(t.id) && <span className="badge">New!</span>}
                        </span>
                        {t.comment && <span className="comment">{t.comment}</span>}
                      </span>
                      {r && <span className="journal-reaction" title={r.label}>{r.emoji}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </>
  )
}

/* ---------- Settings ---------- */

function Settings({ state, onName, onReplace, notify }) {
  const fileRef = useRef(null)

  const backup = () => {
    download(`first-100-foods-backup-${today()}.json`, JSON.stringify({ app: 'first-100-foods', version: 1, ...state }, null, 2), 'application/json')
    notify('Backup downloaded')
  }

  const restore = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const next = normalizeImport(JSON.parse(await file.text()))
      if (confirm(`Replace current data with ${next.tries.length} entries from this backup?`)) onReplace(next, 'Backup restored')
    } catch (err) {
      alert(err.message || 'Could not read that file')
    }
  }

  return (
    <>
      <section className="card">
        <h2>Baby</h2>
        <label className="field">
          <span>Name</span>
          <input value={state.babyName} onChange={(e) => onName(e.target.value)} placeholder="Baby’s name" />
        </label>
      </section>

      <section className="card">
        <h2>Your data</h2>
        <p className="muted small">Everything is saved only on this device, in this browser. Download a backup now and then, or to move to another phone.</p>
        <button className="btn" onClick={backup}>Download backup</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>Restore from backup</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={restore} />
        <button className="btn danger" onClick={() => confirm('Erase all tries, comments and custom foods?') && onReplace(EMPTY_STATE, 'All data erased')}>
          Erase all data
        </button>
      </section>

      <p className="muted small center">
        This app is a log, not medical advice. Ask your pediatrician about when and how to introduce foods.
        <br />Tip: Share → Add to Home Screen to open it like an app.
      </p>
    </>
  )
}
