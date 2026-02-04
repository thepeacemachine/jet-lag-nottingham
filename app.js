const { useState, useEffect, useRef } = React;

// Card types and their configurations
const CARD_CONFIG = {
    matching: { count: 3, drawCount: 3, pickCount: 1, color: '#3b82f6', label: 'Matching' },
    measuring: { count: 3, drawCount: 3, pickCount: 1, color: '#10b981', label: 'Measuring' },
    radar: { count: 2, drawCount: 2, pickCount: 1, color: '#f59e0b', label: 'Radar' },
    thermometer: { count: 2, drawCount: 2, pickCount: 1, color: '#eab308', label: 'Thermometer' },
    photo: { count: 1, drawCount: 1, pickCount: 1, color: '#06b6d4', label: 'Photo' }
};

const RADAR_DISTANCES = ['5 mi', '3 mi', '1 mi', '½ mi', '¼ mi', 'Custom'];
const HIDER_CARD_TYPES = ['Veto', 'Time +5min', 'Time +10min', 'Time +15min', 'Time +20min', 'Duplicate'];

// Nottingham center coordinates
const NOTTINGHAM_CENTER = [52.9548, -1.1581];

function App() {
    // Game state
    const [gameState, setGameState] = useState('setup'); // setup, hiding, hunting, finished
    const [playerCount, setPlayerCount] = useState(4);
    const [role, setRole] = useState(''); // hider or seeker
    const [team, setTeam] = useState(1); // For 5-player games
    
    // Location tracking
    const [myLocation, setMyLocation] = useState(null);
    const [gpsAccuracy, setGpsAccuracy] = useState(null);
    const [gpsError, setGpsError] = useState(null);
    
    // Seeker cards
    const [seekerCards, setSeekerCards] = useState({
        matching: 3,
        measuring: 3,
        radar: 2,
        thermometer: 2,
        photo: 1
    });
    
    // Hider hand
    const [hiderHand, setHiderHand] = useState([]);
    
    // Timers
    const [hidingTimeLeft, setHidingTimeLeft] = useState(60 * 60); // 1 hour in seconds
    const [huntingTime, setHuntingTime] = useState(0);
    
    // UI state
    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState(null);
    const [lastThermoPosition, setLastThermoPosition] = useState(null);
    
    // Refs
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const watchIdRef = useRef(null);

    // Initialize map when game starts
    useEffect(() => {
        if (gameState !== 'setup' && mapRef.current && !mapInstanceRef.current) {
            initializeMap();
        }
    }, [gameState]);

    // GPS tracking
    useEffect(() => {
        if (gameState !== 'setup' && 'geolocation' in navigator) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const newLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setMyLocation(newLocation);
                    setGpsAccuracy(Math.round(position.coords.accuracy));
                    setGpsError(null);
                    updateMapMarker(newLocation);
                },
                (error) => {
                    setGpsError(error.message);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 5000,
                    timeout: 10000
                }
            );

            return () => {
                if (watchIdRef.current) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                }
            };
        }
    }, [gameState]);

    // Hiding timer
    useEffect(() => {
        if (gameState === 'hiding' && hidingTimeLeft > 0) {
            const timer = setInterval(() => {
                setHidingTimeLeft(prev => {
                    if (prev <= 1) {
                        setGameState('hunting');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [gameState, hidingTimeLeft]);

    // Hunting timer
    useEffect(() => {
        if (gameState === 'hunting') {
            const timer = setInterval(() => {
                setHuntingTime(prev => prev + 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [gameState]);

    function initializeMap() {
        if (mapInstanceRef.current) return;
        
        const map = L.map(mapRef.current).setView(NOTTINGHAM_CENTER, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
        
        mapInstanceRef.current = map;
    }

    function updateMapMarker(location) {
        if (!mapInstanceRef.current) return;
        
        if (markerRef.current) {
            markerRef.current.setLatLng([location.lat, location.lng]);
        } else {
            const icon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background: ${role === 'hider' ? '#ef4444' : '#3b82f6'}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                iconSize: [20, 20]
            });
            
            markerRef.current = L.marker([location.lat, location.lng], { icon }).addTo(mapInstanceRef.current);
        }
        
        mapInstanceRef.current.setView([location.lat, location.lng], mapInstanceRef.current.getZoom());
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 3958.8; // Earth's radius in miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    function formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function startGame() {
        if (!role) {
            alert('Please select your role!');
            return;
        }
        setGameState('hiding');
    }

    function useQuestion(type) {
        if (role !== 'seeker' || seekerCards[type] <= 0) return;
        
        setShowModal(true);
        setModalContent({ type, step: 'input' });
    }

    function submitQuestion(type, data) {
        // Deduct the card
        setSeekerCards(prev => ({
            ...prev,
            [type]: prev[type] - 1
        }));
        
        // Show result
        setModalContent({ type, step: 'result', data });
        
        // Hider draws a card
        if (role === 'hider') {
            drawHiderCard();
        }
    }

    function drawHiderCard() {
        if (hiderHand.length >= 6) {
            alert('Hand is full! Discard a card first.');
            return;
        }
        
        const randomCard = HIDER_CARD_TYPES[Math.floor(Math.random() * HIDER_CARD_TYPES.length)];
        setHiderHand(prev => [...prev, { id: Date.now(), type: randomCard }]);
    }

    function discardCard(cardId) {
        setHiderHand(prev => prev.filter(card => card.id !== cardId));
    }

    function playVeto() {
        const vetoCard = hiderHand.find(card => card.type === 'Veto');
        if (!vetoCard) {
            alert('No Veto card in hand!');
            return;
        }
        
        setHiderHand(prev => prev.filter(card => card.id !== vetoCard.id));
        setShowModal(false);
        alert('Question vetoed! Seeker loses their question.');
    }

    function endGame() {
        const timeBonus = hiderHand
            .filter(card => card.type.startsWith('Time +'))
            .reduce((total, card) => {
                const mins = parseInt(card.type.match(/\d+/)[0]);
                return total + (mins * 60);
            }, 0);
        
        const totalScore = huntingTime + timeBonus;
        
        setModalContent({
            type: 'gameOver',
            huntingTime,
            timeBonus,
            totalScore
        });
        setShowModal(true);
        setGameState('finished');
    }

    // Setup Screen
    if (gameState === 'setup') {
        return (
            <div className="container">
                <div className="header">
                    <h1>🎮 Jet Lag: Nottingham</h1>
                    <p>Hide & Seek Edition</p>
                </div>
                <div className="content">
                    <h2 style={{marginBottom: '15px'}}>Game Setup</h2>
                    
                    <label style={{display: 'block', marginBottom: '5px', fontWeight: 600}}>Number of Players</label>
                    <select 
                        className="select-input"
                        value={playerCount}
                        onChange={(e) => setPlayerCount(parseInt(e.target.value))}
                    >
                        <option value={4}>4 Players (1 Hider vs 3 Seekers)</option>
                        <option value={5}>5 Players (1 Hider vs 2 Teams of 2)</option>
                    </select>

                    <label style={{display: 'block', marginTop: '15px', marginBottom: '5px', fontWeight: 600}}>Your Role</label>
                    <select 
                        className="select-input"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                    >
                        <option value="">Select your role...</option>
                        <option value="hider">🎯 Hider</option>
                        <option value="seeker">🔍 Seeker</option>
                    </select>

                    {playerCount === 5 && role === 'seeker' && (
                        <>
                            <label style={{display: 'block', marginTop: '15px', marginBottom: '5px', fontWeight: 600}}>Your Team</label>
                            <select 
                                className="select-input"
                                value={team}
                                onChange={(e) => setTeam(parseInt(e.target.value))}
                            >
                                <option value={1}>Team 1</option>
                                <option value={2}>Team 2</option>
                            </select>
                        </>
                    )}

                    <div className="status status-info" style={{marginTop: '20px'}}>
                        <strong>Game Rules:</strong>
                        <ul style={{marginLeft: '20px', marginTop: '10px', fontSize: '13px', lineHeight: '1.6'}}>
                            <li>Hider gets 60 minutes to find a pub and hide nearby</li>
                            <li>After hiding time, seekers hunt until line-of-sight catch</li>
                            <li>Seekers use question cards to locate hider</li>
                            <li>Hider draws cards after each question</li>
                            <li>Score = hunting time + time bonus cards</li>
                        </ul>
                    </div>

                    <button 
                        className="button button-primary"
                        onClick={startGame}
                        style={{marginTop: '20px'}}
                    >
                        Start Game
                    </button>
                </div>
            </div>
        );
    }

    // Game Screen
    return (
        <div className="container">
            <div className="header">
                <h1>🎮 Jet Lag: Nottingham</h1>
                <p>{role === 'hider' ? '🎯 Hider' : '🔍 Seeker'} {playerCount === 5 && role === 'seeker' ? `- Team ${team}` : ''}</p>
            </div>

            <div className="content">
                {/* GPS Status */}
                {myLocation && (
                    <div className="gps-status">
                        <span>📍 GPS Active</span>
                        <span className="gps-accuracy">±{gpsAccuracy}m</span>
                    </div>
                )}
                
                {gpsError && (
                    <div className="status status-warning">
                        ⚠️ GPS Error: {gpsError}
                    </div>
                )}

                {/* Map */}
                <div className="map-container">
                    <div id="map" ref={mapRef}></div>
                </div>

                {/* Timer */}
                <div className="timer">
                    <div className="timer-label">
                        {gameState === 'hiding' ? 'Hiding Time Remaining' : 'Hunting Time'}
                    </div>
                    <div className="timer-value">
                        {formatTime(gameState === 'hiding' ? hidingTimeLeft : huntingTime)}
                    </div>
                </div>

                {/* Seeker Cards */}
                {role === 'seeker' && gameState === 'hunting' && (
                    <>
                        <h3 style={{marginTop: '20px', marginBottom: '10px'}}>Your Questions</h3>
                        <div className="card-grid">
                            {Object.entries(seekerCards).map(([type, count]) => (
                                <div
                                    key={type}
                                    className={`card card-${type}`}
                                    onClick={() => count > 0 && useQuestion(type)}
                                    style={{ opacity: count === 0 ? 0.3 : 1 }}
                                >
                                    <span className="card-count">{count}</span>
                                    <span className="card-label">{CARD_CONFIG[type].label}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Hider Hand */}
                {role === 'hider' && (
                    <>
                        <h3 style={{marginTop: '20px', marginBottom: '10px'}}>
                            Your Hand ({hiderHand.length}/6)
                        </h3>
                        {hiderHand.length === 0 ? (
                            <div className="status status-info">
                                You'll draw cards as seekers ask questions
                            </div>
                        ) : (
                            <div className="hand-container">
                                {hiderHand.map(card => (
                                    <div key={card.id} className="hand-card">
                                        <span>{card.type}</span>
                                        <button
                                            onClick={() => discardCard(card.id)}
                                            style={{
                                                padding: '5px 12px',
                                                background: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '5px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Discard
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Game Controls */}
                {gameState === 'hunting' && role === 'hider' && (
                    <button 
                        className="button button-primary"
                        onClick={endGame}
                        style={{marginTop: '20px'}}
                    >
                        I've Been Caught!
                    </button>
                )}

                {gameState === 'hiding' && role === 'hider' && (
                    <div className="status status-info">
                        Find a pub and hide within walking distance. Game starts when timer ends!
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <QuestionModal
                    content={modalContent}
                    onClose={() => setShowModal(false)}
                    onSubmit={submitQuestion}
                    onVeto={playVeto}
                    myLocation={myLocation}
                    role={role}
                    hiderHand={hiderHand}
                />
            )}
        </div>
    );
}

// Question Modal Component
function QuestionModal({ content, onClose, onSubmit, onVeto, myLocation, role, hiderHand }) {
    const [input, setInput] = useState('');
    const [distance, setDistance] = useState('1 mi');

    if (!content) return null;

    if (content.type === 'gameOver') {
        return (
            <div className="modal">
                <div className="modal-content">
                    <div className="modal-title">🎉 Game Over!</div>
                    <div style={{textAlign: 'center', padding: '20px 0'}}>
                        <div style={{fontSize: '48px', marginBottom: '20px'}}>⏱️</div>
                        <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '5px'}}>
                            Hunting Time
                        </div>
                        <div style={{fontSize: '32px', fontWeight: 'bold', marginBottom: '20px'}}>
                            {Math.floor(content.huntingTime / 60)}m {content.huntingTime % 60}s
                        </div>
                        <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '5px'}}>
                            Time Bonus Cards
                        </div>
                        <div style={{fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginBottom: '20px'}}>
                            +{Math.floor(content.timeBonus / 60)} minutes
                        </div>
                        <div style={{borderTop: '2px solid #e5e7eb', paddingTop: '20px'}}>
                            <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '5px'}}>
                                Final Score
                            </div>
                            <div style={{fontSize: '40px', fontWeight: 'bold', color: '#667eea'}}>
                                {Math.floor(content.totalScore / 60)}:{(content.totalScore % 60).toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>
                    <button className="button button-primary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        );
    }

    const hasVeto = hiderHand.some(card => card.type === 'Veto');

    if (content.step === 'input') {
        return (
            <div className="modal">
                <div className="modal-content">
                    <div className="modal-title">
                        {CARD_CONFIG[content.type].label} Question
                    </div>

                    {content.type === 'matching' && (
                        <div>
                            <p style={{marginBottom: '15px', color: '#6b7280'}}>
                                Specify a location/landmark type to check if your nearest one matches the hider's:
                            </p>
                            <input
                                type="text"
                                className="text-input"
                                placeholder="e.g., Tram stop, Park, Church..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button 
                                className="button button-primary"
                                onClick={() => onSubmit('matching', { landmark: input })}
                                disabled={!input.trim()}
                            >
                                Ask Question
                            </button>
                        </div>
                    )}

                    {content.type === 'measuring' && (
                        <div>
                            <p style={{marginBottom: '15px', color: '#6b7280'}}>
                                Specify a location to check if hider is closer/further than you:
                            </p>
                            <input
                                type="text"
                                className="text-input"
                                placeholder="e.g., Nottingham Castle, City Centre..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button 
                                className="button button-primary"
                                onClick={() => onSubmit('measuring', { landmark: input })}
                                disabled={!input.trim()}
                            >
                                Ask Question
                            </button>
                        </div>
                    )}

                    {content.type === 'radar' && (
                        <div>
                            <p style={{marginBottom: '15px', color: '#6b7280'}}>
                                Check if hider is within a certain distance:
                            </p>
                            <select 
                                className="select-input"
                                value={distance}
                                onChange={(e) => setDistance(e.target.value)}
                            >
                                {RADAR_DISTANCES.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            {distance === 'Custom' && (
                                <input
                                    type="text"
                                    className="text-input"
                                    placeholder="Enter custom distance..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                />
                            )}
                            <button 
                                className="button button-primary"
                                onClick={() => onSubmit('radar', { 
                                    distance: distance === 'Custom' ? input : distance 
                                })}
                                disabled={distance === 'Custom' && !input.trim()}
                            >
                                Use Radar
                            </button>
                        </div>
                    )}

                    {content.type === 'thermometer' && (
                        <div>
                            <p style={{marginBottom: '15px', color: '#6b7280'}}>
                                Move at least 100m, then ask if you're warmer or colder!
                            </p>
                            <button 
                                className="button button-primary"
                                onClick={() => onSubmit('thermometer', { location: myLocation })}
                            >
                                Check Temperature
                            </button>
                        </div>
                    )}

                    {content.type === 'photo' && (
                        <div>
                            <p style={{marginBottom: '15px', color: '#6b7280'}}>
                                Request a photo of something the hider can see:
                            </p>
                            <input
                                type="text"
                                className="text-input"
                                placeholder="e.g., Tallest building, Red door, Tram..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button 
                                className="button button-primary"
                                onClick={() => onSubmit('photo', { subject: input })}
                                disabled={!input.trim()}
                            >
                                Request Photo
                            </button>
                        </div>
                    )}

                    {role === 'hider' && hasVeto && (
                        <button 
                            className="button button-secondary"
                            onClick={onVeto}
                            style={{background: '#ef4444', color: 'white', marginTop: '10px'}}
                        >
                            Play Veto Card
                        </button>
                    )}

                    <button 
                        className="button button-secondary"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    if (content.step === 'result') {
        return (
            <div className="modal">
                <div className="modal-content">
                    <div className="modal-title">Question Result</div>
                    <div style={{padding: '20px 0', textAlign: 'center'}}>
                        <div style={{fontSize: '48px', marginBottom: '15px'}}>
                            {role === 'hider' ? '📥' : '📤'}
                        </div>
                        <p style={{fontSize: '18px', marginBottom: '10px'}}>
                            Question sent!
                        </p>
                        <p style={{color: '#6b7280', fontSize: '14px'}}>
                            {role === 'hider' 
                                ? 'Answer the seeker\'s question, then you\'ll draw a card.'
                                : 'Waiting for hider to respond...'}
                        </p>
                    </div>
                    <button className="button button-primary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return null;
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
