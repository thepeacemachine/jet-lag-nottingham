const { useState, useEffect, useRef } = React;

// Card types and their configurations
const CARD_CONFIG = {
    matching: { count: 3, color: '#3b82f6', label: 'Matching', icon: '🔵' },
    measuring: { count: 3, color: '#10b981', label: 'Measuring', icon: '🟢' },
    radar: { count: 2, color: '#f59e0b', label: 'Radar', icon: '🟠' },
    thermometer: { count: 2, color: '#eab308', label: 'Thermometer', icon: '🟡' },
    photo: { count: 1, color: '#06b6d4', label: 'Photo', icon: '🔷' }
};

const RADAR_DISTANCES = ['5 mi', '3 mi', '1 mi', '½ mi', '¼ mi', 'Custom'];
const NOTTINGHAM_CENTER = [52.9548, -1.1581];

// Convert distance string to meters
function distanceToMeters(distStr) {
    if (distStr.includes('mi')) {
        const num = parseFloat(distStr);
        return num * 1609.34; // miles to meters
    }
    if (distStr.includes('km')) {
        const num = parseFloat(distStr);
        return num * 1000;
    }
    if (distStr.includes('m')) {
        return parseFloat(distStr);
    }
    return 1609.34; // default 1 mile
}

function App() {
    const [gameStarted, setGameStarted] = useState(false);
    const [seekerCards, setSeekerCards] = useState({
        matching: 3,
        measuring: 3,
        radar: 2,
        thermometer: 2,
        photo: 1
    });
    const [usedQuestions, setUsedQuestions] = useState([]);
    const [myLocation, setMyLocation] = useState(null);
    const [gpsAccuracy, setGpsAccuracy] = useState(null);
    
    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState(null);
    const [selectedMapPoint, setSelectedMapPoint] = useState(null);
    const [pendingQuestion, setPendingQuestion] = useState(null);
    const [activeQuestionType, setActiveQuestionType] = useState(null);
    
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const myMarkerRef = useRef(null);
    const questionMarkersRef = useRef([]);
    const shadedAreasRef = useRef([]);
    const tempMarkerRef = useRef(null);
    const watchIdRef = useRef(null);

    // Initialize map
    useEffect(() => {
        if (gameStarted && mapRef.current && !mapInstanceRef.current) {
            const map = L.map(mapRef.current).setView(NOTTINGHAM_CENTER, 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);
            mapInstanceRef.current = map;
            
            // Add click handler for placing questions
            map.on('click', (e) => {
                if (activeQuestionType) {
                    handleMapClick(e.latlng);
                }
            });
        }
    }, [gameStarted, activeQuestionType]);

    // GPS tracking (still track for reference)
    useEffect(() => {
        if (gameStarted && 'geolocation' in navigator) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const newLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setMyLocation(newLocation);
                    setGpsAccuracy(Math.round(position.coords.accuracy));
                    updateMyMarker(newLocation);
                },
                (error) => console.error('GPS error:', error),
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
    }, [gameStarted]);

    function updateMyMarker(location) {
        if (!mapInstanceRef.current) return;
        
        if (myMarkerRef.current) {
            myMarkerRef.current.setLatLng([location.lat, location.lng]);
        } else {
            const icon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                iconSize: [20, 20]
            });
            myMarkerRef.current = L.marker([location.lat, location.lng], { icon }).addTo(mapInstanceRef.current);
            myMarkerRef.current.bindPopup('Your current location');
        }
    }

    function handleMapClick(latlng) {
        setSelectedMapPoint({ lat: latlng.lat, lng: latlng.lng });
        
        // Remove temporary marker if exists
        if (tempMarkerRef.current) {
            tempMarkerRef.current.remove();
        }
        
        // Add temporary marker
        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background: ${CARD_CONFIG[activeQuestionType].color}; width: 35px; height: 35px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 20px; animation: pulse 1s infinite;">${CARD_CONFIG[activeQuestionType].icon}</div>`,
            iconSize: [35, 35]
        });
        tempMarkerRef.current = L.marker([latlng.lat, latlng.lng], { icon }).addTo(mapInstanceRef.current);
        
        // Show modal to confirm question details
        setShowModal(true);
        setModalContent({ type: activeQuestionType, action: 'ask' });
    }

    function useQuestion(type) {
        if (seekerCards[type] <= 0) return;
        
        // Cancel if already selecting
        if (activeQuestionType === type) {
            setActiveQuestionType(null);
            if (tempMarkerRef.current) {
                tempMarkerRef.current.remove();
                tempMarkerRef.current = null;
            }
            return;
        }
        
        setActiveQuestionType(type);
        setSelectedMapPoint(null);
        alert(`📍 Tap on the map where you want to ask this ${CARD_CONFIG[type].label} question!`);
    }

    function confirmQuestion(type, details) {
        if (!selectedMapPoint) {
            alert('Please select a location on the map first!');
            return;
        }

        // Store question with pending answer
        const question = {
            type: type,
            details: details,
            location: { ...selectedMapPoint },
            timestamp: Date.now(),
            timeUsed: new Date().toLocaleTimeString(),
            answered: false,
            answer: null
        };
        
        setPendingQuestion(question);
        setShowModal(false);
        
        // Clear temp marker
        if (tempMarkerRef.current) {
            tempMarkerRef.current.remove();
            tempMarkerRef.current = null;
        }
        
        // Show answer modal
        setModalContent({ type, action: 'answer', question });
        setShowModal(true);
    }

    function submitAnswer(answer) {
        const question = { ...pendingQuestion, answered: true, answer: answer };
        
        setSeekerCards(prev => ({
            ...prev,
            [question.type]: prev[question.type] - 1
        }));
        
        setUsedQuestions(prev => [...prev, question]);
        addQuestionMarker(question);
        addShadedArea(question);
        
        setShowModal(false);
        setActiveQuestionType(null);
        setPendingQuestion(null);
    }

    function addQuestionMarker(question) {
        if (!mapInstanceRef.current || !question.location) return;
        
        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background: ${CARD_CONFIG[question.type].color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 16px;">${CARD_CONFIG[question.type].icon}</div>`,
            iconSize: [30, 30]
        });
        
        const marker = L.marker([question.location.lat, question.location.lng], { icon }).addTo(mapInstanceRef.current);
        
        let popupText = `<strong>${CARD_CONFIG[question.type].label}</strong><br>${question.details || ''}<br>${question.timeUsed}`;
        if (question.answered) {
            popupText += `<br><strong>Answer:</strong> ${question.answer}`;
        }
        
        marker.bindPopup(popupText);
        questionMarkersRef.current.push(marker);
    }

    function addShadedArea(question) {
        if (!mapInstanceRef.current || !question.location || !question.answered) return;
        
        const { type, location, answer, details } = question;
        
        // Handle Radar questions
        if (type === 'radar') {
            const distance = distanceToMeters(details);
            
            if (answer === 'No') {
                // Hider is NOT within this radius - shade the circle
                const circle = L.circle([location.lat, location.lng], {
                    radius: distance,
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.15,
                    weight: 2,
                    dashArray: '5, 5'
                }).addTo(mapInstanceRef.current);
                circle.bindPopup(`❌ NOT within ${details}`);
                shadedAreasRef.current.push(circle);
            } else if (answer === 'Yes') {
                // Hider IS within this radius - shade everything OUTSIDE
                // Create a large outer circle and cut out the inner circle
                const outerRadius = 50000; // 50km
                const innerRadius = distance;
                
                // Create donut shape using a polygon
                const outerCirclePoints = [];
                const innerCirclePoints = [];
                const numPoints = 64;
                
                for (let i = 0; i <= numPoints; i++) {
                    const angle = (i * 360) / numPoints;
                    const rad = (angle * Math.PI) / 180;
                    
                    // Outer circle points
                    const outerLat = location.lat + (outerRadius / 111000) * Math.cos(rad);
                    const outerLng = location.lng + (outerRadius / (111000 * Math.cos(location.lat * Math.PI / 180))) * Math.sin(rad);
                    outerCirclePoints.push([outerLat, outerLng]);
                    
                    // Inner circle points (reversed for hole)
                    const innerLat = location.lat + (innerRadius / 111000) * Math.cos(rad);
                    const innerLng = location.lng + (innerRadius / (111000 * Math.cos(location.lat * Math.PI / 180))) * Math.sin(rad);
                    innerCirclePoints.unshift([innerLat, innerLng]);
                }
                
                const polygon = L.polygon([outerCirclePoints, innerCirclePoints], {
                    color: '#10b981',
                    fillColor: '#10b981',
                    fillOpacity: 0.15,
                    weight: 2,
                    dashArray: '5, 5'
                }).addTo(mapInstanceRef.current);
                polygon.bindPopup(`❌ NOT beyond ${details}`);
                shadedAreasRef.current.push(polygon);
                
                // Also draw the boundary circle
                const boundaryCircle = L.circle([location.lat, location.lng], {
                    radius: distance,
                    color: '#10b981',
                    fillColor: 'transparent',
                    fillOpacity: 0,
                    weight: 3
                }).addTo(mapInstanceRef.current);
                boundaryCircle.bindPopup(`✅ Within ${details} of this point`);
                shadedAreasRef.current.push(boundaryCircle);
            }
        }
        
        // Handle Thermometer questions
        if (type === 'thermometer') {
            // Just mark the point for reference
            const circle = L.circle([location.lat, location.lng], {
                radius: 50,
                color: answer === 'Warmer' ? '#ef4444' : '#3b82f6',
                fillColor: answer === 'Warmer' ? '#ef4444' : '#3b82f6',
                fillOpacity: 0.3,
                weight: 2
            }).addTo(mapInstanceRef.current);
            circle.bindPopup(`🌡️ ${answer} from previous position`);
            shadedAreasRef.current.push(circle);
        }
    }

    function resetGame() {
        if (confirm('Reset the game? This will clear all progress.')) {
            setGameStarted(false);
            setSeekerCards({
                matching: 3,
                measuring: 3,
                radar: 2,
                thermometer: 2,
                photo: 1
            });
            setUsedQuestions([]);
            setActiveQuestionType(null);
            setSelectedMapPoint(null);
            
            // Clear map markers and shaded areas
            questionMarkersRef.current.forEach(marker => marker.remove());
            questionMarkersRef.current = [];
            shadedAreasRef.current.forEach(area => area.remove());
            shadedAreasRef.current = [];
            if (myMarkerRef.current) {
                myMarkerRef.current.remove();
                myMarkerRef.current = null;
            }
            if (tempMarkerRef.current) {
                tempMarkerRef.current.remove();
                tempMarkerRef.current = null;
            }
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        }
    }

    function clearShadedAreas() {
        if (confirm('Clear all shaded areas? (Questions will remain)')) {
            shadedAreasRef.current.forEach(area => area.remove());
            shadedAreasRef.current = [];
        }
    }

    // Setup screen
    if (!gameStarted) {
        return (
            <div className="container">
                <div className="header">
                    <h1>🔍 Seeker App</h1>
                    <p>Click the map to ask questions</p>
                </div>
                <div className="content">
                    <div style={{textAlign: 'center', padding: '40px 20px'}}>
                        <div style={{fontSize: '80px', marginBottom: '20px'}}>🗺️</div>
                        <h2 style={{marginBottom: '15px'}}>Ready to Hunt?</h2>
                        <p style={{color: '#6b7280', marginBottom: '30px', lineHeight: '1.6'}}>
                            Click anywhere on the map to ask questions from that location.
                            The map will shade areas that are ruled out based on answers!
                        </p>
                    </div>

                    <div className="status status-info">
                        <strong>How it works:</strong>
                        <ul style={{marginLeft: '20px', marginTop: '10px', fontSize: '13px', lineHeight: '1.6'}}>
                            <li>Select a question type (Radar, Matching, etc.)</li>
                            <li>Click on the map where you want to ask from</li>
                            <li>Ask your friend the question via WhatsApp/Snap</li>
                            <li>Enter their answer (Yes/No, Warmer/Colder, etc.)</li>
                            <li>Map automatically shades ruled-out areas!</li>
                            <li>Use elimination to find the hider</li>
                        </ul>
                    </div>

                    <button 
                        className="button button-primary"
                        onClick={() => setGameStarted(true)}
                        style={{marginTop: '20px', fontSize: '18px', padding: '18px'}}
                    >
                        Start Seeking 🔍
                    </button>
                </div>
            </div>
        );
    }

    // Game screen
    return (
        <div className="container">
            <div className="header">
                <h1>🔍 Seeker</h1>
                <p>
                    {activeQuestionType 
                        ? `📍 Tap map to place ${CARD_CONFIG[activeQuestionType].label} question` 
                        : 'Select a question type below'}
                </p>
            </div>

            <div className="content">
                {/* Map */}
                <div className="map-container">
                    <div id="map" ref={mapRef}></div>
                </div>

                {/* GPS Status */}
                {myLocation && (
                    <div className="gps-status">
                        <span>📍 Your location tracked</span>
                        <span className="gps-accuracy">±{gpsAccuracy}m</span>
                    </div>
                )}

                {/* Question Cards */}
                <h3 style={{marginTop: '20px', marginBottom: '10px'}}>Available Questions</h3>
                <div className="card-grid">
                    {Object.entries(CARD_CONFIG).map(([type, config]) => (
                        <div 
                            key={type}
                            className={`card card-${type}`}
                            onClick={() => useQuestion(type)}
                            style={{
                                opacity: seekerCards[type] <= 0 ? 0.3 : 1,
                                cursor: seekerCards[type] <= 0 ? 'not-allowed' : 'pointer',
                                border: activeQuestionType === type ? '4px solid white' : 'none',
                                boxShadow: activeQuestionType === type ? '0 0 20px rgba(255,255,255,0.8)' : 'none',
                                transform: activeQuestionType === type ? 'scale(1.05)' : 'scale(1)'
                            }}
                        >
                            <span className="card-count">{seekerCards[type]}</span>
                            <span className="card-label">{config.label}</span>
                        </div>
                    ))}
                </div>

                {activeQuestionType && (
                    <div className="status status-warning" style={{marginTop: '10px'}}>
                        📍 Click anywhere on the map to place your {CARD_CONFIG[activeQuestionType].label} question!
                        <br/>
                        <button 
                            onClick={() => {
                                setActiveQuestionType(null);
                                if (tempMarkerRef.current) {
                                    tempMarkerRef.current.remove();
                                    tempMarkerRef.current = null;
                                }
                            }}
                            style={{
                                marginTop: '8px',
                                padding: '6px 12px',
                                background: '#fff',
                                border: '2px solid #f59e0b',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 'bold'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {/* Questions History */}
                {usedQuestions.length > 0 && (
                    <>
                        <h3 style={{marginTop: '25px', marginBottom: '10px'}}>
                            Questions Asked ({usedQuestions.length})
                        </h3>
                        <div style={{maxHeight: '200px', overflowY: 'auto'}}>
                            {usedQuestions.slice().reverse().map((q, idx) => (
                                <div key={idx} className="hand-card" style={{marginBottom: '8px'}}>
                                    <div>
                                        <div style={{fontWeight: 'bold', marginBottom: '3px'}}>
                                            {CARD_CONFIG[q.type].icon} {CARD_CONFIG[q.type].label}
                                        </div>
                                        {q.details && (
                                            <div style={{fontSize: '13px', color: '#374151', marginBottom: '2px'}}>
                                                {q.details}
                                            </div>
                                        )}
                                        {q.answer && (
                                            <div style={{fontSize: '13px', color: '#10b981', fontWeight: 'bold', marginBottom: '2px'}}>
                                                Answer: {q.answer}
                                            </div>
                                        )}
                                        <div style={{fontSize: '12px', color: '#6b7280'}}>
                                            {q.timeUsed}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Controls */}
                <div style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
                    <button 
                        className="button button-secondary"
                        onClick={clearShadedAreas}
                        style={{flex: 1}}
                    >
                        Clear Shading
                    </button>
                    <button 
                        className="button button-secondary"
                        onClick={resetGame}
                        style={{flex: 1}}
                    >
                        🔄 Reset Game
                    </button>
                </div>
            </div>

            {/* Question Modal */}
            {showModal && modalContent?.action === 'ask' && (
                <QuestionModal
                    type={modalContent.type}
                    onClose={() => {
                        setShowModal(false);
                        if (tempMarkerRef.current) {
                            tempMarkerRef.current.remove();
                            tempMarkerRef.current = null;
                        }
                        setSelectedMapPoint(null);
                    }}
                    onConfirm={confirmQuestion}
                />
            )}

            {/* Answer Modal */}
            {showModal && modalContent?.action === 'answer' && (
                <AnswerModal
                    question={modalContent.question}
                    onSubmit={submitAnswer}
                    onCancel={() => {
                        setShowModal(false);
                        setPendingQuestion(null);
                        setActiveQuestionType(null);
                    }}
                />
            )}
        </div>
    );
}

// Question Modal Component
function QuestionModal({ type, onClose, onConfirm }) {
    const [input, setInput] = useState('');
    const [distance, setDistance] = useState('1 mi');

    function handleConfirm() {
        let details = '';
        
        if (type === 'matching' || type === 'measuring') {
            if (!input.trim()) {
                alert('Please specify a landmark!');
                return;
            }
            details = input;
        } else if (type === 'radar') {
            details = distance === 'Custom' ? input : distance;
            if (distance === 'Custom' && !input.trim()) {
                alert('Please enter a custom distance!');
                return;
            }
        } else if (type === 'thermometer') {
            details = 'Warmer/Colder check';
        } else if (type === 'photo') {
            if (!input.trim()) {
                alert('Please specify what to photograph!');
                return;
            }
            details = input;
        }
        
        onConfirm(type, details);
    }

    return (
        <div className="modal">
            <div className="modal-content">
                <div className="modal-title">
                    {CARD_CONFIG[type].icon} {CARD_CONFIG[type].label} Question
                </div>

                {type === 'matching' && (
                    <div>
                        <p style={{marginBottom: '15px', color: '#6b7280', fontSize: '14px'}}>
                            Ask: "Is your nearest [X] the same as mine?"
                        </p>
                        <input
                            type="text"
                            className="text-input"
                            placeholder="e.g., Pub, Tram stop, Park..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            autoFocus
                        />
                    </div>
                )}

                {type === 'measuring' && (
                    <div>
                        <p style={{marginBottom: '15px', color: '#6b7280', fontSize: '14px'}}>
                            Ask: "Are you closer to [X] than me?"
                        </p>
                        <input
                            type="text"
                            className="text-input"
                            placeholder="e.g., Nottingham Castle, City Centre..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            autoFocus
                        />
                    </div>
                )}

                {type === 'radar' && (
                    <div>
                        <p style={{marginBottom: '15px', color: '#6b7280', fontSize: '14px'}}>
                            Ask: "Are you within [distance] of this point?"
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
                                placeholder="e.g., 2 mi, 500m..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                autoFocus
                            />
                        )}
                    </div>
                )}

                {type === 'thermometer' && (
                    <div>
                        <p style={{marginBottom: '15px', color: '#6b7280', fontSize: '14px'}}>
                            Ask your friend:<br/>
                            <strong>"Am I warmer or colder than my last position?"</strong>
                        </p>
                    </div>
                )}

                {type === 'photo' && (
                    <div>
                        <p style={{marginBottom: '15px', color: '#6b7280', fontSize: '14px'}}>
                            Ask: "Send me a photo of [X]"
                        </p>
                        <input
                            type="text"
                            className="text-input"
                            placeholder="e.g., Tallest building, Red door, Tram..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            autoFocus
                        />
                    </div>
                )}

                <div className="status status-warning" style={{marginTop: '15px', fontSize: '13px'}}>
                    💬 You'll send this question to the hider via WhatsApp/Snap!
                </div>

                <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                    <button 
                        className="button button-secondary"
                        onClick={onClose}
                        style={{flex: 1}}
                    >
                        Cancel
                    </button>
                    <button 
                        className="button button-primary"
                        onClick={handleConfirm}
                        style={{flex: 1}}
                    >
                        Ask Question
                    </button>
                </div>
            </div>
        </div>
    );
}

// Answer Modal Component
function AnswerModal({ question, onSubmit, onCancel }) {
    const [answer, setAnswer] = useState('');

    function handleSubmit() {
        if (!answer) {
            alert('Please select an answer!');
            return;
        }
        onSubmit(answer);
    }

    return (
        <div className="modal">
            <div className="modal-content">
                <div className="modal-title">
                    What did they answer?
                </div>
                
                <div style={{background: '#f3f4f6', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
                    <div style={{fontWeight: 'bold', marginBottom: '8px'}}>
                        {CARD_CONFIG[question.type].icon} {CARD_CONFIG[question.type].label}
                    </div>
                    <div style={{fontSize: '14px', color: '#374151'}}>
                        {question.details}
                    </div>
                </div>

                <p style={{marginBottom: '15px', color: '#6b7280', fontSize: '14px'}}>
                    Enter your friend's answer:
                </p>

                {/* Radar: Yes/No */}
                {question.type === 'radar' && (
                    <div style={{display: 'grid', gap: '10px'}}>
                        <button
                            onClick={() => setAnswer('Yes')}
                            style={{
                                padding: '15px',
                                background: answer === 'Yes' ? '#10b981' : '#f3f4f6',
                                color: answer === 'Yes' ? 'white' : '#374151',
                                border: answer === 'Yes' ? '3px solid #059669' : '2px solid #e5e7eb',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '16px'
                            }}
                        >
                            ✅ Yes, within {question.details}
                        </button>
                        <button
                            onClick={() => setAnswer('No')}
                            style={{
                                padding: '15px',
                                background: answer === 'No' ? '#ef4444' : '#f3f4f6',
                                color: answer === 'No' ? 'white' : '#374151',
                                border: answer === 'No' ? '3px solid #dc2626' : '2px solid #e5e7eb',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '16px'
                            }}
                        >
                            ❌ No, NOT within {question.details}
                        </button>
                    </div>
                )}

                {/* Thermometer: Warmer/Colder */}
                {question.type === 'thermometer' && (
                    <div style={{display: 'grid', gap: '10px'}}>
                        <button
                            onClick={() => setAnswer('Warmer')}
                            style={{
                                padding: '15px',
                                background: answer === 'Warmer' ? '#ef4444' : '#f3f4f6',
                                color: answer === 'Warmer' ? 'white' : '#374151',
                                border: answer === 'Warmer' ? '3px solid #dc2626' : '2px solid #e5e7eb',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '16px'
                            }}
                        >
                            🔥 Warmer (getting closer)
                        </button>
                        <button
                            onClick={() => setAnswer('Colder')}
                            style={{
                                padding: '15px',
                                background: answer === 'Colder' ? '#3b82f6' : '#f3f4f6',
                                color: answer === 'Colder' ? 'white' : '#374151',
                                border: answer === 'Colder' ? '3px solid #2563eb' : '2px solid #e5e7eb',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '16px'
                            }}
                        >
                            ❄️ Colder (getting further)
                        </button>
                    </div>
                )}

                {/* Matching: Yes/No/Different */}
                {question.type === 'matching' && (
                    <div style={{display: 'grid', gap: '10px'}}>
                        <button
                            onClick={() => setAnswer('Same')}
                            style={{
                                padding: '15px',
                                background: answer === 'Same' ? '#10b981' : '#f3f4f6',
                                color: answer === 'Same' ? 'white' : '#374151',
                                border: answer === 'Same' ? '3px solid #059669' : '2px solid #e5e7eb',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '16px'
                            }}
                        >
                            ✅ Same
                        </button>
                        <button
                            onClick={() => setAnswer('Different')}
                            style={{
                                padding: '15px',
                                background: answer === 'Different' ? '#ef4444' : '#f3f4f6',
                                color: answer === 'Different' ? 'white' : '#374151',
                                border: answer === 'Different' ? '3px solid #dc2626' : '2px solid #e5e7eb',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '16px'
                            }}
                        >
                            ❌ Different
                        </button>
                    </div>
                )}

                {/* Measuring: Closer/Further */}
                {question.type === 'measuring' && (
                    <div style={{display: 'grid', gap: '10px'}}>
                        <button
                            onClick={() => setAnswer('Closer')}
                            style={{
                                padding: '15px',
                                background: answer === 'Closer' ? '#10b981' : '#f3f4f6',
                                color: answer === 'Closer' ? 'white' : '#374151',
                                border: answer === 'Closer' ? '3px solid #059669' : '2px solid #e5e7eb',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '16px'
                            }}
                        >
                            ✅ Yes, I'm closer
                        </button>
                        <button
                            onClick={() => setAnswer('Further')}
                            style={{
                                padding: '15px',
                                background: answer === 'Further' ? '#ef4444' : '#f3f4f6',
                                color: answer === 'Further' ? 'white' : '#374151',
                                border: answer === 'Further' ? '3px solid #dc2626' : '2px solid #e5e7eb',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '16px'
                            }}
                        >
                            ❌ No, I'm further
                        </button>
                    </div>
                )}

                {/* Photo: Received */}
                {question.type === 'photo' && (
                    <div style={{display: 'grid', gap: '10px'}}>
                        <button
                            onClick={() => setAnswer('Photo Received')}
                            style={{
                                padding: '15px',
                                background: answer === 'Photo Received' ? '#06b6d4' : '#f3f4f6',
                                color: answer === 'Photo Received' ? 'white' : '#374151',
                                border: answer === 'Photo Received' ? '3px solid #0891b2' : '2px solid #e5e7eb',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '16px'
                            }}
                        >
                            📸 Photo Received
                        </button>
                    </div>
                )}

                <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                    <button 
                        className="button button-secondary"
                        onClick={onCancel}
                        style={{flex: 1}}
                    >
                        Cancel
                    </button>
                    <button 
                        className="button button-primary"
                        onClick={handleSubmit}
                        style={{flex: 1}}
                        disabled={!answer}
                    >
                        Submit Answer
                    </button>
                </div>
            </div>
        </div>
    );
}

// Add pulse animation to styles
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
`;
document.head.appendChild(style);

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
