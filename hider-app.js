const { useState, useEffect } = React;

const QUESTION_TYPES = [
    { type: 'matching', label: 'Matching', icon: '🔵', color: '#3b82f6' },
    { type: 'measuring', label: 'Measuring', icon: '🟢', color: '#10b981' },
    { type: 'radar', label: 'Radar', icon: '🟠', color: '#f59e0b' },
    { type: 'thermometer', label: 'Thermometer', icon: '🟡', color: '#eab308' },
    { type: 'photo', label: 'Photo', icon: '🔷', color: '#06b6d4' }
];

const HIDER_CARD_TYPES = ['Veto', 'Time +5min', 'Time +10min', 'Time +15min', 'Time +20min', 'Duplicate'];

function App() {
    const [gameStarted, setGameStarted] = useState(false);
    const [hiderHand, setHiderHand] = useState([]);
    const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState(0);
    const [gameTime, setGameTime] = useState(0);
    const [timerRunning, setTimerRunning] = useState(false);
    const [questionHistory, setQuestionHistory] = useState([]);
    
    const [showModal, setShowModal] = useState(false);
    const [showScoreModal, setShowScoreModal] = useState(false);

    // Game timer
    useEffect(() => {
        if (timerRunning && gameStarted) {
            const interval = setInterval(() => {
                setGameTime(prev => prev + 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [timerRunning, gameStarted]);

    function formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function startGame() {
        setGameStarted(true);
        setTimerRunning(true);
    }

    function answerQuestion(questionType) {
        setShowModal(false);
        
        // Draw a random card
        const randomCard = HIDER_CARD_TYPES[Math.floor(Math.random() * HIDER_CARD_TYPES.length)];
        
        if (hiderHand.length >= 6) {
            alert(`Hand is full! Card drawn: ${randomCard}\nDiscard a card to add it to your hand.`);
        } else {
            setHiderHand(prev => [...prev, { id: Date.now(), type: randomCard }]);
        }
        
        setTotalQuestionsAnswered(prev => prev + 1);
        setQuestionHistory(prev => [...prev, {
            type: questionType,
            card: randomCard,
            time: formatTime(gameTime),
            timestamp: Date.now()
        }]);
        
        // Show what card was drawn
        setTimeout(() => {
            alert(`✅ Question answered!\n\n🎴 You drew: ${randomCard}`);
        }, 100);
    }

    function discardCard(cardId) {
        setHiderHand(prev => prev.filter(card => card.id !== cardId));
    }

    function calculateFinalScore() {
        const timeBonus = hiderHand
            .filter(card => card.type.startsWith('Time +'))
            .reduce((total, card) => {
                const mins = parseInt(card.type.match(/\d+/)[0]);
                return total + (mins * 60);
            }, 0);
        
        return {
            huntingTime: gameTime,
            timeBonus: timeBonus,
            totalScore: gameTime + timeBonus
        };
    }

    function resetGame() {
        if (confirm('Reset the game? This will clear all progress.')) {
            setGameStarted(false);
            setTimerRunning(false);
            setGameTime(0);
            setHiderHand([]);
            setTotalQuestionsAnswered(0);
            setQuestionHistory([]);
        }
    }

    // Setup screen
    if (!gameStarted) {
        return (
            <div className="container">
                <div className="header">
                    <h1>🎯 Hider App</h1>
                    <p>Answer questions & collect cards</p>
                </div>
                <div className="content">
                    <div style={{textAlign: 'center', padding: '40px 20px'}}>
                        <div style={{fontSize: '80px', marginBottom: '20px'}}>🎴</div>
                        <h2 style={{marginBottom: '15px'}}>Ready to Hide?</h2>
                        <p style={{color: '#6b7280', marginBottom: '30px', lineHeight: '1.6'}}>
                            When seekers ask you questions (via WhatsApp/Snap), select the question type here to draw a card!
                        </p>
                    </div>

                    <div className="status status-info">
                        <strong>How it works:</strong>
                        <ul style={{marginLeft: '20px', marginTop: '10px', fontSize: '13px', lineHeight: '1.6'}}>
                            <li>Seekers will send you questions via WhatsApp/Snap</li>
                            <li>Answer the question verbally</li>
                            <li>Select the question type in this app</li>
                            <li>Draw a random card automatically</li>
                            <li>Max 6 cards in hand - discard extras</li>
                            <li>Time bonus cards add to your final score!</li>
                        </ul>
                    </div>

                    <button 
                        className="button button-primary"
                        onClick={startGame}
                        style={{marginTop: '20px', fontSize: '18px', padding: '18px'}}
                    >
                        Start Hiding 🎯
                    </button>
                </div>
            </div>
        );
    }

    // Game screen
    return (
        <div className="container">
            <div className="header">
                <h1>🎯 Hider</h1>
                <p>Stay hidden & collect cards!</p>
            </div>

            <div className="content">
                {/* Timer */}
                <div className="timer">
                    <div className="timer-label">Hunt Time</div>
                    <div className="timer-value">{formatTime(gameTime)}</div>
                    <button
                        onClick={() => setTimerRunning(!timerRunning)}
                        style={{
                            marginTop: '10px',
                            padding: '8px 20px',
                            background: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        {timerRunning ? '⏸ Pause' : '▶️ Resume'}
                    </button>
                </div>

                {/* Stats */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '15px',
                    margin: '20px 0'
                }}>
                    <div style={{
                        background: '#f0f9ff',
                        padding: '15px',
                        borderRadius: '10px',
                        textAlign: 'center'
                    }}>
                        <div style={{fontSize: '32px', fontWeight: 'bold', color: '#0284c7'}}>
                            {totalQuestionsAnswered}
                        </div>
                        <div style={{fontSize: '12px', color: '#6b7280'}}>
                            Questions Answered
                        </div>
                    </div>
                    <div style={{
                        background: '#f0fdf4',
                        padding: '15px',
                        borderRadius: '10px',
                        textAlign: 'center'
                    }}>
                        <div style={{fontSize: '32px', fontWeight: 'bold', color: '#16a34a'}}>
                            {hiderHand.length}/6
                        </div>
                        <div style={{fontSize: '12px', color: '#6b7280'}}>
                            Cards in Hand
                        </div>
                    </div>
                </div>

                {/* Answer Question Button */}
                <button 
                    className="button button-primary"
                    onClick={() => setShowModal(true)}
                    style={{fontSize: '18px', padding: '20px'}}
                >
                    📩 Seeker Asked a Question
                </button>
                <p style={{fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '8px'}}>
                    Click when you receive and answer a seeker's question
                </p>

                {/* Hand */}
                {hiderHand.length > 0 && (
                    <>
                        <h3 style={{marginTop: '25px', marginBottom: '15px'}}>
                            Your Hand ({hiderHand.length}/6)
                        </h3>
                        <div className="hand-container">
                            {hiderHand.map(card => (
                                <div key={card.id} className="hand-card">
                                    <div>
                                        <div style={{fontWeight: 'bold', fontSize: '15px'}}>
                                            {card.type.startsWith('Time') ? '⏰' : 
                                             card.type === 'Veto' ? '🚫' : '📋'} {card.type}
                                        </div>
                                        {card.type === 'Veto' && (
                                            <div style={{fontSize: '11px', color: '#6b7280', marginTop: '2px'}}>
                                                Cancel a seeker's question
                                            </div>
                                        )}
                                        {card.type.startsWith('Time') && (
                                            <div style={{fontSize: '11px', color: '#6b7280', marginTop: '2px'}}>
                                                Adds to final score
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => discardCard(card.id)}
                                        style={{
                                            padding: '6px 14px',
                                            background: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '13px'
                                        }}
                                    >
                                        Discard
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Question History */}
                {questionHistory.length > 0 && (
                    <>
                        <h3 style={{marginTop: '25px', marginBottom: '15px'}}>
                            Recent Questions ({questionHistory.length})
                        </h3>
                        <div style={{maxHeight: '200px', overflowY: 'auto'}}>
                            {questionHistory.slice().reverse().slice(0, 5).map((q, idx) => {
                                const questionType = QUESTION_TYPES.find(qt => qt.type === q.type);
                                return (
                                    <div key={idx} className="hand-card" style={{marginBottom: '8px'}}>
                                        <div>
                                            <div style={{fontWeight: 'bold', marginBottom: '3px'}}>
                                                {questionType?.icon} {questionType?.label}
                                            </div>
                                            <div style={{fontSize: '13px', color: '#374151', marginBottom: '2px'}}>
                                                Drew: {q.card}
                                            </div>
                                            <div style={{fontSize: '12px', color: '#6b7280'}}>
                                                {q.time}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Score Preview */}
                <div className="status status-info" style={{marginTop: '25px'}}>
                    <strong>Current Score Preview:</strong>
                    <div style={{marginTop: '10px', lineHeight: '1.8'}}>
                        <div>⏱️ Hunt time: {formatTime(gameTime)}</div>
                        <div>⏰ Time bonuses: +{
                            hiderHand.filter(c => c.type.startsWith('Time +')).reduce((sum, c) => {
                                return sum + parseInt(c.type.match(/\d+/)[0]);
                            }, 0)
                        } minutes</div>
                        <div style={{fontWeight: 'bold', marginTop: '8px', fontSize: '16px'}}>
                            🏆 Total: {formatTime(calculateFinalScore().totalScore)}
                        </div>
                    </div>
                </div>

                {/* Game Controls */}
                <div style={{marginTop: '25px', display: 'flex', gap: '10px'}}>
                    <button 
                        className="button button-primary"
                        onClick={() => {
                            setTimerRunning(false);
                            setShowScoreModal(true);
                        }}
                        style={{flex: 1}}
                    >
                        😭 I've Been Caught!
                    </button>
                    <button 
                        className="button button-secondary"
                        onClick={resetGame}
                        style={{flex: 1}}
                    >
                        🔄 Reset
                    </button>
                </div>
            </div>

            {/* Question Type Selection Modal */}
            {showModal && (
                <div className="modal">
                    <div className="modal-content">
                        <div className="modal-title">What question type?</div>
                        <p style={{color: '#6b7280', marginBottom: '20px', fontSize: '14px'}}>
                            Select which type of question the seeker just asked:
                        </p>
                        
                        <div style={{display: 'grid', gap: '12px'}}>
                            {QUESTION_TYPES.map(qt => (
                                <button
                                    key={qt.type}
                                    onClick={() => answerQuestion(qt.type)}
                                    style={{
                                        padding: '18px',
                                        background: qt.color,
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        transition: 'transform 0.2s'
                                    }}
                                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <span style={{fontSize: '28px'}}>{qt.icon}</span>
                                    <span>{qt.label}</span>
                                </button>
                            ))}
                        </div>

                        <button 
                            className="button button-secondary"
                            onClick={() => setShowModal(false)}
                            style={{marginTop: '15px'}}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Final Score Modal */}
            {showScoreModal && (
                <div className="modal">
                    <div className="modal-content">
                        <div style={{textAlign: 'center', padding: '20px 0'}}>
                            <div style={{fontSize: '64px', marginBottom: '20px'}}>🎉</div>
                            <div className="modal-title" style={{marginBottom: '20px'}}>Game Over!</div>
                            
                            <div style={{marginBottom: '15px'}}>
                                <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '5px'}}>
                                    Hunt Time
                                </div>
                                <div style={{fontSize: '32px', fontWeight: 'bold'}}>
                                    {Math.floor(calculateFinalScore().huntingTime / 60)}m {calculateFinalScore().huntingTime % 60}s
                                </div>
                            </div>
                            
                            <div style={{marginBottom: '15px'}}>
                                <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '5px'}}>
                                    Time Bonus Cards
                                </div>
                                <div style={{fontSize: '24px', fontWeight: 'bold', color: '#10b981'}}>
                                    +{Math.floor(calculateFinalScore().timeBonus / 60)} minutes
                                </div>
                            </div>
                            
                            <div style={{
                                borderTop: '2px solid #e5e7eb',
                                paddingTop: '15px',
                                marginTop: '15px'
                            }}>
                                <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '5px'}}>
                                    Final Score
                                </div>
                                <div style={{fontSize: '48px', fontWeight: 'bold', color: '#667eea'}}>
                                    {Math.floor(calculateFinalScore().totalScore / 60)}:{(calculateFinalScore().totalScore % 60).toString().padStart(2, '0')}
                                </div>
                                <div style={{fontSize: '14px', color: '#6b7280', marginTop: '10px'}}>
                                    Questions answered: {totalQuestionsAnswered}
                                </div>
                            </div>
                        </div>
                        
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button 
                                className="button button-secondary"
                                onClick={() => setShowScoreModal(false)}
                                style={{flex: 1}}
                            >
                                Close
                            </button>
                            <button 
                                className="button button-primary"
                                onClick={() => {
                                    setShowScoreModal(false);
                                    resetGame();
                                }}
                                style={{flex: 1}}
                            >
                                New Game
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
