import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';

interface Deck {
  id: string;
  name: string;
  description?: string;
}

interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  box: number; // Leitner system: Box 1 to 5
  nextReview: number; // timestamp
}

// Spaced repetition intervals in milliseconds (days * 24 * 60 * 60 * 1000)
const LEITNER_INTERVALS: { [key: number]: number } = {
  1: 1 * 24 * 60 * 60 * 1000,   // 1 day
  2: 2 * 24 * 60 * 60 * 1000,   // 2 days
  3: 4 * 24 * 60 * 60 * 1000,   // 4 days
  4: 9 * 24 * 60 * 60 * 1000,   // 9 days
  5: 16 * 24 * 60 * 60 * 1000   // 16 days
};

export const Flashcards: React.FC = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  
  // Study session states
  const [studyList, setStudyList] = useState<Flashcard[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isStudying, setIsStudying] = useState(false);

  // Deck form state
  const [showAddDeck, setShowAddDeck] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [deckDesc, setDeckDesc] = useState('');

  // Card form state
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');

  const loadData = async () => {
    try {
      const allDecks = await db.getAll('flashcard_decks');
      const allCards = await db.getAll('flashcards');
      setDecks(allDecks);
      setCards(allCards);
      
      if (allDecks.length > 0 && !activeDeck) {
        setActiveDeck(allDecks[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDeck = async () => {
    if (!deckName.trim()) return;

    const newDeck: Deck = {
      id: crypto.randomUUID(),
      name: deckName,
      description: deckDesc || undefined
    };

    try {
      await db.put('flashcard_decks', newDeck);
      setDeckName('');
      setDeckDesc('');
      setShowAddDeck(false);
      await loadData();
      setActiveDeck(newDeck);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm('Are you sure you want to delete this deck? All its cards will be lost.')) return;
    try {
      await db.delete('flashcard_decks', deckId);
      
      // Delete all cards belonging to deck
      const deckCards = cards.filter(c => c.deckId === deckId);
      for (const card of deckCards) {
        await db.delete('flashcards', card.id);
      }

      const remainingDecks = decks.filter(d => d.id !== deckId);
      setDecks(remainingDecks);
      setActiveDeck(remainingDecks.length > 0 ? remainingDecks[0] : null);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCard = async () => {
    if (!cardFront.trim() || !cardBack.trim() || !activeDeck) return;

    const newCard: Flashcard = {
      id: crypto.randomUUID(),
      deckId: activeDeck.id,
      front: cardFront,
      back: cardBack,
      box: 1, // Start in box 1
      nextReview: Date.now() // Ready immediately
    };

    try {
      await db.put('flashcards', newCard);
      setCardFront('');
      setCardBack('');
      setShowAddCard(false);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await db.delete('flashcards', cardId);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const startStudy = () => {
    if (!activeDeck) return;
    const now = Date.now();
    const ready = cards.filter(c => c.deckId === activeDeck.id && c.nextReview <= now);
    
    if (ready.length === 0) {
      alert('🎉 Excellent! No cards left to review in this deck today.');
      return;
    }

    setStudyList(ready);
    setStudyIndex(0);
    setIsFlipped(false);
    setIsStudying(true);
  };

  const handleReviewAnswer = async (correct: boolean) => {
    const card = studyList[studyIndex];
    if (!card) return;

    let nextBox = card.box;
    if (correct) {
      nextBox = Math.min(5, card.box + 1);
    } else {
      nextBox = 1; // Return back to box 1 on failure
    }

    const interval = LEITNER_INTERVALS[nextBox];
    const nextReview = Date.now() + interval;

    const updatedCard: Flashcard = {
      ...card,
      box: nextBox,
      nextReview
    };

    try {
      await db.put('flashcards', updatedCard);
      
      // Update local cache
      setCards(prev => prev.map(c => c.id === card.id ? updatedCard : c));

      // Advance study list index
      if (studyIndex + 1 < studyList.length) {
        setStudyIndex(studyIndex + 1);
        setIsFlipped(false);
      } else {
        // Complete study
        setIsStudying(false);
        alert('🎯 Deck study review complete! Well done.');
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deckCards = activeDeck ? cards.filter(c => c.deckId === activeDeck.id) : [];
  const readyCount = activeDeck ? cards.filter(c => c.deckId === activeDeck.id && c.nextReview <= Date.now()).length : 0;

  return (
    <div className="module-container" style={{ flexDirection: 'row' }}>
      
      {/* Sidebar: Decks */}
      <div className="module-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowAddDeck(true)}>
            ➕ Create Deck
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {decks.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No decks created.
            </div>
          ) : (
            decks.map(d => {
              const count = cards.filter(c => c.deckId === d.id).length;
              const due = cards.filter(c => c.deckId === d.id && c.nextReview <= Date.now()).length;
              
              return (
                <div
                  key={d.id}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid var(--glass-border)',
                    cursor: 'pointer',
                    background: activeDeck?.id === d.id ? 'rgba(255,255,255,0.05)' : 'transparent'
                  }}
                  onClick={() => {
                    setActiveDeck(d);
                    setIsStudying(false);
                  }}
                >
                  <div style={{ fontWeight: 500, fontSize: '13px' }}>{d.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Cards: {count}</span>
                    {due > 0 && <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>{due} due</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Flashcard review workspace */}
      <div className="module-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}>
        {activeDeck ? (
          isStudying ? (
            /* Study Screen Mode */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', width: '100%', display: 'flex', justifyContent: 'space-between', maxWidth: '450px' }}>
                <span>Studying: <strong>{activeDeck.name}</strong></span>
                <span>Card: <strong>{studyIndex + 1} / {studyList.length}</strong></span>
              </div>

              {/* Flashcard container */}
              <div 
                className="glass-panel"
                style={{
                  width: '100%',
                  maxWidth: '450px',
                  height: '240px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  fontSize: '18px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: '1.5px solid var(--accent-color)',
                  background: isFlipped ? 'rgba(0,0,0,0.3)' : 'var(--glass-bg)',
                  boxShadow: 'var(--accent-glow)',
                  transition: 'transform 0.4s',
                  transform: isFlipped ? 'rotateY(180deg)' : 'none',
                  padding: '20px'
                }}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div style={{ transform: isFlipped ? 'rotateY(-180deg)' : 'none' }}>
                  {isFlipped ? studyList[studyIndex]?.back : studyList[studyIndex]?.front}
                </div>
              </div>

              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click card to flip and reveal the answer.</span>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn" onClick={() => setIsStudying(false)}>Exit Session</button>
                {isFlipped && (
                  <>
                    <button className="btn btn-danger" onClick={() => handleReviewAnswer(false)}>❌ Incorrect</button>
                    <button className="btn btn-primary" onClick={() => handleReviewAnswer(true)}>✅ Correct</button>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Deck Details / Card Creator Mode */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '18px' }}>{activeDeck.name}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{activeDeck.description || 'No description provided.'}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" onClick={startStudy} disabled={readyCount === 0}>
                    🎯 Review Decks ({readyCount} due)
                  </button>
                  <button className="btn" onClick={() => setShowAddCard(true)}>
                    ➕ Add Flashcard
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDeleteDeck(activeDeck.id)}>
                    Delete Deck
                  </button>
                </div>
              </div>

              {/* Cards list in active deck */}
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-secondary)' }}>Decks Cards:</h4>
                {deckCards.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    This deck is empty. Click "Add Flashcard" to begin!
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                    {deckCards.map(c => {
                      const daysLeft = Math.max(0, Math.ceil((c.nextReview - Date.now()) / (24 * 60 * 60 * 1000)));
                      
                      return (
                        <div key={c.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', position: 'relative' }}>
                          <button
                            onClick={() => handleDeleteCard(c.id)}
                            style={{ position: 'absolute', top: '6px', right: '6px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}
                          >
                            ×
                          </button>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>Q: {c.front}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', borderTop: '1px dashed var(--glass-border)', paddingTop: '4px' }}>A: {c.back}</div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginTop: '10px', color: 'var(--text-muted)' }}>
                            <span>Leitner Box: <strong>{c.box}</strong></span>
                            <span>{daysLeft === 0 ? '🟢 Review Due Now' : `⏳ Next review in ${daysLeft} days`}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="state-container" style={{ flex: 1 }}>
            <span className="state-icon">🎴</span>
            <h4>No Deck Selected</h4>
            <p style={{ color: 'var(--text-secondary)' }}>Select a study deck from the sidebar or create a new one.</p>
          </div>
        )}
      </div>

      {/* Add Deck Modal */}
      {showAddDeck && (
        <div className="launcher-overlay" onClick={() => setShowAddDeck(false)}>
          <div className="launcher-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>Create Flashcard Deck</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Deck Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  placeholder="e.g. Physics Formulas, Spanish Vocab"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Description</label>
                <textarea
                  className="textarea-field"
                  rows={3}
                  value={deckDesc}
                  onChange={(e) => setDeckDesc(e.target.value)}
                  placeholder="Enter deck syllabus details..."
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className="btn" onClick={() => setShowAddDeck(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreateDeck}>Create Deck</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {showAddCard && (
        <div className="launcher-overlay" onClick={() => setShowAddCard(false)}>
          <div className="launcher-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>Add Flashcard</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Question (Front Side)</label>
                <textarea
                  className="textarea-field"
                  rows={2}
                  value={cardFront}
                  onChange={(e) => setCardFront(e.target.value)}
                  placeholder="e.g. What is Kepler's First Law?"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Answer (Back Side)</label>
                <textarea
                  className="textarea-field"
                  rows={3}
                  value={cardBack}
                  onChange={(e) => setCardBack(e.target.value)}
                  placeholder="e.g. All planets move in elliptical orbits with the Sun at one focus."
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className="btn" onClick={() => setShowAddCard(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreateCard}>Add Card</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
