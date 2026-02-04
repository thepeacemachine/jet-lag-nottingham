const { useState, useEffect, useRef } = React;

// Card types and their configurations
const CARD_CONFIG = {
    matching: { 
        count: 6, 
        color: '#2c3e50', 
        label: 'MATCHING', 
        subtitle: 'DRAW 3, PICK 1',
        icon: '🎯',
        questions: [
            'Are you north or south of us?',
            'Are you east or west of us?',
            'Are you in the same neighborhood / district as us?',
            'Are you in the same ZIP code / ward as us?',
            'Are you on the same street as us?',
            'Are you at the same pub as us?'
        ]
    },
    radar: { 
        count: 2, 
        color: '#e67e22', 
        label: 'RADAR', 
        subtitle: 'DRAW 2, PICK 1',
        icon: '🎯',
        distances: ['5 mi', '3 mi', '1 mi', '½ mi', '¼ mi']
    },
    thermometer: { 
        count: 2, 
        color: '#f39c12', 
        label: 'THERMOMETER', 
        subtitle: 'DRAW 2, PICK 1',
        icon: '🌡️',
        distances: ['100m', '200m', '500m']
    },
    photo: { 
        count: 9, 
        color: '#3498db', 
        label: 'PHOTO', 
        subtitle: 'DRAW 1',
        icon: '📷',
        questions: [
            'The nearest street sign',
            'The nearest intersection',
            'The nearest transit stop',
            'The tallest building you can see',
            'A visible landmark',
            'Five distinct buildings',
            'The street surface',
            'A photo taken straight up',
            'A photo taken straight down'
        ]
    }
};

const NOTTINGHAM_CENTER = [52.9548, -1.1581];

// Convert distance string to meters
function distanceToMeters(distStr) {
    if (distStr.includes('mi')) {
        const num = parseFloat(distStr);
        return num * 1609.34;
    }
    if (distStr.includes('km')) {
        const num = parseFloat(distStr);
        return num * 1000;
    }
    if (distStr.includes('m')) {
        return parseFloat(distStr);
    }
    return 1609.34;
}

function App() {
    const [gameStarted, setGameStarted] = useState(false);
    const [usedQuestions, setUsedQuestions] = useState({
        matching: [],
        radar: [],
        thermometer: [],
        photo: []
    });
    const [myLocation, setMyLocation] = useState(null);
    const [gpsAccuracy, setGpsAccuracy] = useState(null);
    
    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState(null);
    const [selectedMapPoint, setSelectedMapPoint] = useState(null);
    const [pendingQuestion, setPendingQuestion] = useState(null);
    const [activeQuestionType, setActiveQuestionType] = useState(null);
    const [thermometerStartPoint, setThermometerStartPoint] = useState(null);
    
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const myMarkerRef = useRef(null);
    const questionMarkersRef = useRef([]);
    const shadedAreasRef = useRef([]);
    const tempMarkerRef = useRef(null);
    const watchIdRef = useRef(null);

    useEffect(() => {
        if (gameStarted && mapRef.current && !mapInstanceRef.current) {
            const map = L.map(mapRef.current).setView(NOTTINGHAM_CENTER, 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);
            mapInstanceRef.current = map;
        }
    }, [gameStarted]);

    useEffect(() => {
        if (!mapInstanceRef.current) return;
        
        mapInstanceRef.current.off('click');
        
        if (activeQuestionType) {
            mapInstanceRef.current.on('click', (e) => {
                handleMapClick(e.latlng);
            });
        }
    }, [activeQuestionType, thermometerStartPoint]);

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
        if (!activeQuestionType) return;
        
        if (activeQuestionType === 'thermometer') {
            if (!thermometerStartPoint) {
                setThermometerStartPoint({ lat: latlng.lat, lng: latlng.lng });
                
                if (tempMarkerRef.current) {
                    tempMarkerRef.current.remove();
                }
                const icon = L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background: #f39c12; width: 35px; height: 35px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white;">START</div>`,
                    iconSize: [35, 35]
                });
                tempMarkerRef.current = L.marker([latlng.lat, latlng.lng], { icon }).addTo(mapInstanceRef.current);
                
                alert('📍 Start point set! Now click where you moved TO.');
                return;
            } else {
                setSelectedMapPoint({ lat: latlng.lat, lng: latlng.lng });
                setShowModal(true);
                setModalContent({ type: activeQuestionType, action: 'ask' });
            }
        } else {
            setSelectedMapPoint({ lat: latlng.lat, lng: latlng.lng });
            
            if (tempMarkerRef.current) {
                tempMarkerRef.current.remove();
            }
            
            const icon = L.divIcon({
                className: 'custom-marker pulse-marker',
                html: `<div style="background: ${CARD_CONFIG[activeQuestionType].color}; width: 35px; height: 35px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 20px;">${CARD_CONFIG[activeQuestionType].icon}</div>`,
                iconSize: [35, 35]
            });
            tempMarkerRef.current = L.marker([latlng.lat, latlng.lng], { icon }).addTo(mapInstanceRef.current);
            
            setShowModal(true);
            setModalContent({ type: activeQuestionType, action: 'ask' });
        }
    }

    function useQuestion(type, specificQuestion) {
        const alreadyUsed = usedQuestions[type].some(q => q.details === specificQuestion);
        if (alreadyUsed) return;
        
        if (activeQuestionType === type) {
            cancelSelection();
            return;
        }
        
        // For photo questions, immediately show them
        if (type === 'photo') {
            setActiveQuestionType('photo');
            setShowModal(true);
            setModalContent({ type: 'photo', action: 'view' });
            return;
        }
        
        setActiveQuestionType(type);
        setSelectedMapPoint(null);
        setThermometerStartPoint(null);
        
        if (type === 'thermometer') {
            alert(`🌡️ Thermometer:\n1. Click your STARTING point\n2. Click where you MOVED to\n3. Ask: "Am I closer or farther?"`);
        } else {
            alert(`📍 Click on the map where you want to ask this ${CARD_CONFIG[type].label} question!`);
        }
    }

    function cancelSelection() {
        setActiveQuestionType(null);
        setThermometerStartPoint(null);
        setSelectedMapPoint(null);
        if (tempMarkerRef.current) {
            tempMarkerRef.current.remove();
            tempMarkerRef.current = null;
        }
    }

    function confirmQuestion(type, details) {
        if (!selectedMapPoint && type !== 'photo') {
            alert('Please select a location on the map first!');
            return;
        }

        const question = {
            type: type,
            details: details,
            location: type === 'photo' ? null : { ...selectedMapPoint },
            startLocation: thermometerStartPoint ? { ...thermometerStartPoint } : null,
            timestamp: Date.now(),
            timeUsed: new Date().toLocaleTimeString(),
            answered: false,
            answer: null
        };
        
        setPendingQuestion(question);
        setShowModal(false);
        
        if (tempMarkerRef.current) {
            tempMarkerRef.current.remove();
            tempMarkerRef.current = null;
        }
        
        // For photo, mark as used immediately
        if (type === 'photo') {
            setUsedQuestions(prev => ({
                ...prev,
                [type]: [...prev[type], { ...question, answered: true, answer: 'Sent' }]
            }));
            setActiveQuestionType(null);
            alert('📸 Photo question sent! Hider will send you the photo via WhatsApp.');
            return;
        }
        
        setModalContent({ type, action: 'answer', question });
        setShowModal(true);
    }

    function submitAnswer(answer) {
        const question = { ...pendingQuestion, answered: true, answer: answer };
        
        setUsedQuestions(prev => ({
            ...prev,
            [question.type]: [...prev[question.type], question]
        }));
        
        addQuestionMarker(question);
        addShadedArea(question);
        
        setShowModal(false);
        setActiveQuestionType(null);
        setPendingQuestion(null);
        setThermometerStartPoint(null);
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
        
        if (question.type === 'thermometer' && question.startLocation) {
            const startIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background: #fbbf24; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: white;">S</div>`,
                iconSize: [25, 25]
            });
            const startMarker = L.marker([question.startLocation.lat, question.startLocation.lng], { icon: startIcon }).addTo(mapInstanceRef.current);
            startMarker.bindPopup('Thermometer Start Point');
            questionMarkersRef.current.push(startMarker);
            
            const line = L.polyline([
                [question.startLocation.lat, question.startLocation.lng],
                [question.location.lat, question.location.lng]
            ], {
                color: '#f39c12',
                weight: 3,
                dashArray: '10, 10'
            }).addTo(mapInstanceRef.current);
            shadedAreasRef.current.push(line);
        }
    }

    function addShadedArea(question) {
        if (!mapInstanceRef.current || !question.location || !question.answered) return;
        
        const { type, location, answer, details, startLocation } = question;
        
        // Radar shading
        if (type === 'radar') {
            const distance = distanceToMeters(details);
            
            if (answer === 'No') {
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
                const outerRadius = 50000;
                const innerRadius = distance;
                
                const outerCirclePoints = [];
                const innerCirclePoints = [];
                const numPoints = 64;
                
                for (let i = 0; i <= numPoints; i++) {
                    const angle = (i * 360) / numPoints;
                    const rad = (angle * Math.PI) / 180;
                    
                    const outerLat = location.lat + (outerRadius / 111000) * Math.cos(rad);
                    const outerLng = location.lng + (outerRadius / (111000 * Math.cos(location.lat * Math.PI / 180))) * Math.sin(rad);
                    outerCirclePoints.push([outerLat, outerLng]);
                    
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
        
        // Matching shading - directional
        if (type === 'matching') {
            const isNorthSouth = details.includes('north or south');
            const isEastWest = details.includes('east or west');
            
            if (isNorthSouth || isEastWest) {
                const largeDistance = 50000; // 50km
                
                if (isNorthSouth) {
                    if (answer === 'North') {
                        // Shade south half
                        const southBounds = [
                            [location.lat - (largeDistance / 111000), location.lng - (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat - (largeDistance / 111000), location.lng + (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat, location.lng + (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat, location.lng - (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))]
                        ];
                        const southPoly = L.polygon(southBounds, {
                            color: '#ef4444',
                            fillColor: '#ef4444',
                            fillOpacity: 0.15,
                            weight: 2,
                            dashArray: '5, 5'
                        }).addTo(mapInstanceRef.current);
                        southPoly.bindPopup('❌ NOT in South');
                        shadedAreasRef.current.push(southPoly);
                    } else if (answer === 'South') {
                        // Shade north half
                        const northBounds = [
                            [location.lat, location.lng - (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat, location.lng + (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat + (largeDistance / 111000), location.lng + (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat + (largeDistance / 111000), location.lng - (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))]
                        ];
                        const northPoly = L.polygon(northBounds, {
                            color: '#ef4444',
                            fillColor: '#ef4444',
                            fillOpacity: 0.15,
                            weight: 2,
                            dashArray: '5, 5'
                        }).addTo(mapInstanceRef.current);
                        northPoly.bindPopup('❌ NOT in North');
                        shadedAreasRef.current.push(northPoly);
                    }
                }
                
                if (isEastWest) {
                    if (answer === 'East') {
                        // Shade west half
                        const westBounds = [
                            [location.lat - (largeDistance / 111000), location.lng - (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat + (largeDistance / 111000), location.lng - (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat + (largeDistance / 111000), location.lng],
                            [location.lat - (largeDistance / 111000), location.lng]
                        ];
                        const westPoly = L.polygon(westBounds, {
                            color: '#ef4444',
                            fillColor: '#ef4444',
                            fillOpacity: 0.15,
                            weight: 2,
                            dashArray: '5, 5'
                        }).addTo(mapInstanceRef.current);
                        westPoly.bindPopup('❌ NOT in West');
                        shadedAreasRef.current.push(westPoly);
                    } else if (answer === 'West') {
                        // Shade east half
                        const eastBounds = [
                            [location.lat - (largeDistance / 111000), location.lng],
                            [location.lat + (largeDistance / 111000), location.lng],
                            [location.lat + (largeDistance / 111000), location.lng + (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat - (largeDistance / 111000), location.lng + (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))]
                        ];
                        const eastPoly = L.polygon(eastBounds, {
                            color: '#ef4444',
                            fillColor: '#ef4444',
                            fillOpacity: 0.15,
                            weight: 2,
                            dashArray: '5, 5'
                        }).addTo(mapInstanceRef.current);
                        eastPoly.bindPopup('❌ NOT in East');
                        shadedAreasRef.current.push(eastPoly);
                    }
                }
                
                // Draw center line
                const linePoints = isNorthSouth 
                    ? [[location.lat, location.lng - 10000], [location.lat, location.lng + 10000]]
                    : [[location.lat - 10000, location.lng], [location.lat + 10000, location.lng]];
                const line = L.polyline(linePoints, {
                    color: '#2c3e50',
                    weight: 3
                }).addTo(mapInstanceRef.current);
                shadedAreasRef.current.push(line);
            }
        }
        
        // Thermometer shading - perpendicular line
        if (type === 'thermometer' && startLocation) {
            const circle = L.circle([location.lat, location.lng], {
                radius: 50,
                color: answer === 'Closer' ? '#ef4444' : '#3b82f6',
                fillColor: answer === 'Closer' ? '#ef4444' : '#3b82f6',
                fillOpacity: 0.3,
                weight: 2
            }).addTo(mapInstanceRef.current);
            circle.bindPopup(`🌡️ ${answer} from start point`);
            shadedAreasRef.current.push(circle);
            
            // Calculate perpendicular line at midpoint
            const midLat = (startLocation.lat + location.lat) / 2;
            const midLng = (startLocation.lng + location.lng) / 2;
            
            const dx = location.lng - startLocation.lng;
            const dy = location.lat - startLocation.lat;
            const length = 0.01; // Length of perpendicular line
            
            const perpLat1 = midLat - dx * length;
            const perpLng1 = midLng + dy * length;
            const perpLat2 = midLat + dx * length;
            const perpLng2 = midLng - dy * length;
            
            const perpLine = L.polyline([
                [perpLat1, perpLng1],
                [perpLat2, perpLng2]
            ], {
                color: answer === 'Closer' ? '#ef4444' : '#3b82f6',
                weight: 4
            }).addTo(mapInstanceRef.current);
            perpLine.bindPopup(answer === 'Closer' ? '🔥 Hider on this side (closer)' : '❄️ Hider on this side (farther)');
            shadedAreasRef.current.push(perpLine);
        }
    }

    function resetGame() {
        if (confirm('Reset the game? This will clear all progress.')) {
            setGameStarted(false);
            setUsedQuestions({
                matching: [],
                radar: [],
                thermometer: [],
                photo: []
            });
            setActiveQuestionType(null);
            setSelectedMapPoint(null);
            setThermometerStartPoint(null);
            
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

    if (!gameStarted) {
        return (
            <div className="container">
                <div className="header">
                    <h1>🔍 Jet Lag: Seeker</h1>
                    <p>Click the map to ask questions</p>
                </div>
                <div className="content">
                    <div style={{textAlign: 'center', padding: '40px 20px'}}>
                        <div style={{fontSize: '80px', marginBottom: '20px'}}>🗺️</div>
                        <h2 style={{marginBottom: '15px'}}>Ready to Hunt?</h2>
                        <p style={{color: '#6b7280', marginBottom: '30px', lineHeight: '1.6'}}>
                            Select question cards, click the map to place them, and watch areas get ruled out!
                        </p>
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

    return (
        <div className="container">
            <div className="header" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                <h1 style={{fontSize: '20px', marginBottom: '5px'}}>🔍 JET LAG: NOTTINGHAM</h1>
                <p style={{fontSize: '13px', opacity: 0.9}}>
                    {activeQuestionType 
                        ? `${thermometerStartPoint ? 'Click END point' : 'Click map to place question'}` 
                        : 'Select a question card below'}
                </p>
            </div>

            <div className="content">
                <div className="map-container">
                    <div id="map" ref={mapRef}></div>
                </div>

                {myLocation && (
                    <div className="gps-status">
                        <span>📍 GPS Active</span>
                        <span className="gps-accuracy">±{gpsAccuracy}m</span>
                    </div>
                )}

                {/* Question Cards Grid */}
                <div style={{marginTop: '20px'}}>
                    {Object.entries(CARD_CONFIG).map(([type, config]) => (
                        <QuestionCard
                            key={type}
                            type={type}
                            config={config}
                            usedQuestions={usedQuestions[type]}
                            activeQuestionType={activeQuestionType}
                            onSelectQuestion={useQuestion}
                        />
                    ))}
                </div>

                {activeQuestionType && activeQuestionType !== 'photo' && (
                    <div className="status status-warning" style={{marginTop: '15px'}}>
                        {activeQuestionType === 'thermometer' && !thermometerStartPoint && (
                            <>📍 Click your STARTING point on the map</>
                        )}
                        {activeQuestionType === 'thermometer' && thermometerStartPoint && (
                            <>📍 Now click where you MOVED to</>
                        )}
                        {activeQuestionType !== 'thermometer' && (
                            <>📍 Click the map to place your {CARD_CONFIG[activeQuestionType].label} question</>
                        )}
                        <br/>
                        <button 
                            onClick={cancelSelection}
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
                        🔄 Reset
                    </button>
                </div>
            </div>

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
                        setThermometerStartPoint(null);
                    }}
                    onConfirm={confirmQuestion}
                />
            )}

            {showModal && modalContent?.action === 'answer' && (
                <AnswerModal
                    question={modalContent.question}
                    onSubmit={submitAnswer}
                    onCancel={cancelSelection}
                />
            )}

            {showModal && modalContent?.action === 'view' && (
                <PhotoListModal
                    usedQuestions={usedQuestions.photo}
                    onSelectPhoto={confirmQuestion}
                    onClose={() => {
                        setShowModal(false);
                        setActiveQuestionType(null);
                    }}
                />
            )}
        </div>
    );
}

// Question Card Component (Jet Lag style)
function QuestionCard({ type, config, usedQuestions, activeQuestionType, onSelectQuestion }) {
    const isActive = activeQuestionType === type;
    const remainingCount = config.count - usedQuestions.length;
    
    return (
        <div style={{marginBottom: '15px'}}>
            <div 
                style={{
                    background: config.color,
                    padding: '15px',
                    borderRadius: '10px 10px 0 0',
                    color: 'white',
                    border: isActive ? '4px solid #fbbf24' : 'none'
                }}
            >
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px'}}>
                    <span style={{fontSize: '24px'}}>{config.icon}</span>
                    <div style={{flex: 1}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px'}}>{config.label}</div>
                        <div style={{fontSize: '11px', opacity: 0.9}}>{config.subtitle}</div>
                    </div>
                    <div style={{fontSize: '24px', fontWeight: 'bold'}}>{remainingCount}</div>
                </div>
            </div>
            
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '5px',
                background: '#f3f4f6',
                padding: '10px',
                borderRadius: '0 0 10px 10px'
            }}>
                {type === 'matching' && config.questions.map((q, idx) => {
                    const used = usedQuestions.some(uq => uq.details === q);
                    return (
                        <QuestionTile
                            key={idx}
                            used={used}
                            icon={idx === 0 ? '✈️' : idx === 1 ? '🧭' : idx === 2 ? '🏘️' : idx === 3 ? '📮' : idx === 4 ? '🛣️' : '🍺'}
                            onClick={() => !used && onSelectQuestion(type, q)}
                        />
                    );
                })}
                
                {type === 'radar' && config.distances.map((d, idx) => {
                    const used = usedQuestions.some(uq => uq.details === d);
                    return (
                        <QuestionTile
                            key={idx}
                            used={used}
                            label={d}
                            onClick={() => !used && onSelectQuestion(type, d)}
                        />
                    );
                })}
                
                {type === 'thermometer' && config.distances.map((d, idx) => {
                    const used = usedQuestions.some(uq => uq.details.includes(d));
                    return (
                        <QuestionTile
                            key={idx}
                            used={used}
                            label={d}
                            onClick={() => !used && onSelectQuestion(type, d)}
                        />
                    );
                })}
                
                {type === 'photo' && config.questions.map((q, idx) => {
                    const used = usedQuestions.some(uq => uq.details === q);
                    return (
                        <QuestionTile
                            key={idx}
                            used={used}
                            icon={idx === 0 ? '🪧' : idx === 1 ? '🚦' : idx === 2 ? '🚏' : idx === 3 ? '🏢' : idx === 4 ? '🗿' : idx === 5 ? '🏘️' : idx === 6 ? '🛣️' : idx === 7 ? '☁️' : '⬇️'}
                            onClick={() => !used && onSelectQuestion(type, q)}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// Individual Question Tile
function QuestionTile({ used, icon, label, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                aspectRatio: '1',
                background: used ? '#d1d5db' : '#fff',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: label ? '11px' : '24px',
                fontWeight: 'bold',
                cursor: used ? 'not-allowed' : 'pointer',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {used && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)'
                }}/>
            )}
            <span style={{position: 'relative', zIndex: 1, opacity: used ? 0.4 : 1}}>
                {icon || label}
            </span>
        </div>
    );
}

// Question Modal
function QuestionModal({ type, onClose, onConfirm }) {
    const [selectedQuestion, setSelectedQuestion] = useState('');
    const [distance, setDistance] = useState(CARD_CONFIG[type].distances ? CARD_CONFIG[type].distances[0] : '');

    function handleConfirm() {
        if ((type === 'matching' || type === 'photo') && !selectedQuestion) {
            alert('Please select a question!');
            return;
        }
        
        if (type === 'matching' || type === 'photo') {
            onConfirm(type, selectedQuestion);
        } else if (type === 'radar') {
            onConfirm(type, distance);
        } else if (type === 'thermometer') {
            onConfirm(type, `Moved ${distance}`);
        }
    }

    return (
        <div className="modal">
            <div className="modal-content">
                <div className="modal-title">{CARD_CONFIG[type].label}</div>

                {type === 'matching' && (
                    <div style={{display: 'grid', gap: '8px'}}>
                        {CARD_CONFIG[type].questions.map(q => (
                            <button key={q} onClick={() => setSelectedQuestion(q)}
                                style={{
                                    padding: '12px', textAlign: 'left', fontSize: '14px',
                                    background: selectedQuestion === q ? CARD_CONFIG[type].color : '#f3f4f6',
                                    color: selectedQuestion === q ? 'white' : '#374151',
                                    border: '2px solid ' + (selectedQuestion === q ? CARD_CONFIG[type].color : '#e5e7eb'),
                                    borderRadius: '8px', cursor: 'pointer', fontWeight: selectedQuestion === q ? 'bold' : 'normal'
                                }}>
                                {q}
                            </button>
                        ))}
                    </div>
                )}

                {type === 'radar' && (
                    <div>
                        <p style={{marginBottom: '15px', fontSize: '14px'}}>Select distance:</p>
                        <div style={{display: 'grid', gap: '8px'}}>
                            {CARD_CONFIG[type].distances.map(d => (
                                <button key={d} onClick={() => setDistance(d)}
                                    style={{
                                        padding: '12px', fontSize: '16px', fontWeight: 'bold',
                                        background: distance === d ? CARD_CONFIG[type].color : '#f3f4f6',
                                        color: distance === d ? 'white' : '#374151',
                                        border: '2px solid ' + (distance === d ? CARD_CONFIG[type].color : '#e5e7eb'),
                                        borderRadius: '8px', cursor: 'pointer'
                                    }}>
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {type === 'thermometer' && (
                    <div>
                        <p style={{marginBottom: '15px', fontSize: '14px'}}>How far did you move?</p>
                        <div style={{display: 'grid', gap: '8px'}}>
                            {CARD_CONFIG[type].distances.map(d => (
                                <button key={d} onClick={() => setDistance(d)}
                                    style={{
                                        padding: '12px', fontSize: '16px', fontWeight: 'bold',
                                        background: distance === d ? CARD_CONFIG[type].color : '#f3f4f6',
                                        color: distance === d ? 'white' : '#374151',
                                        border: '2px solid ' + (distance === d ? CARD_CONFIG[type].color : '#e5e7eb'),
                                        borderRadius: '8px', cursor: 'pointer'
                                    }}>
                                    {d}
                                </button>
                            ))}
                        </div>
                        <p style={{marginTop: '10px', fontSize: '13px', color: '#6b7280'}}>
                            Then ask: <strong>"Are we closer or farther?"</strong>
                        </p>
                    </div>
                )}

                <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                    <button className="button button-secondary" onClick={onClose} style={{flex: 1}}>Cancel</button>
                    <button className="button button-primary" onClick={handleConfirm} style={{flex: 1}}>Ask Question</button>
                </div>
            </div>
        </div>
    );
}

// Photo List Modal
function PhotoListModal({ usedQuestions, onSelectPhoto, onClose }) {
    return (
        <div className="modal">
            <div className="modal-content">
                <div className="modal-title">📷 PHOTO QUESTIONS</div>
                <p style={{marginBottom: '15px', fontSize: '13px', color: '#6b7280'}}>
                    Select a photo to request. Hider will send it via WhatsApp.
                </p>
                
                <div style={{display: 'grid', gap: '8px', maxHeight: '400px', overflowY: 'auto'}}>
                    {CARD_CONFIG.photo.questions.map(q => {
                        const used = usedQuestions.some(uq => uq.details === q);
                        return (
                            <button key={q}
                                onClick={() => !used && onSelectPhoto('photo', q)}
                                disabled={used}
                                style={{
                                    padding: '12px', textAlign: 'left', fontSize: '14px',
                                    background: used ? '#d1d5db' : '#3498db',
                                    color: 'white',
                                    border: '2px solid #2980b9',
                                    borderRadius: '8px',
                                    cursor: used ? 'not-allowed' : 'pointer',
                                    opacity: used ? 0.5 : 1
                                }}>
                                📷 {q} {used && '✓'}
                            </button>
                        );
                    })}
                </div>

                <button className="button button-secondary" onClick={onClose} style={{marginTop: '15px', width: '100%'}}>
                    Close
                </button>
            </div>
        </div>
    );
}

// Answer Modal
function AnswerModal({ question, onSubmit, onCancel }) {
    const [answer, setAnswer] = useState('');

    const isDirectional = question.type === 'matching' && 
        (question.details.includes('north or south') || question.details.includes('east or west'));

    return (
        <div className="modal">
            <div className="modal-content">
                <div className="modal-title">What did they answer?</div>
                
                <div style={{background: '#f3f4f6', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
                    <div style={{fontWeight: 'bold', marginBottom: '8px'}}>{CARD_CONFIG[question.type].label}</div>
                    <div style={{fontSize: '14px'}}>{question.details}</div>
                </div>

                <div style={{display: 'grid', gap: '10px'}}>
                    {question.type === 'radar' && (
                        <>
                            <button onClick={() => setAnswer('Yes')} style={{
                                padding: '15px', fontWeight: 'bold', fontSize: '16px', borderRadius: '8px',
                                background: answer === 'Yes' ? '#10b981' : '#f3f4f6',
                                color: answer === 'Yes' ? 'white' : '#374151',
                                border: '3px solid ' + (answer === 'Yes' ? '#059669' : '#e5e7eb'),
                                cursor: 'pointer'
                            }}>✅ Yes</button>
                            <button onClick={() => setAnswer('No')} style={{
                                padding: '15px', fontWeight: 'bold', fontSize: '16px', borderRadius: '8px',
                                background: answer === 'No' ? '#ef4444' : '#f3f4f6',
                                color: answer === 'No' ? 'white' : '#374151',
                                border: '3px solid ' + (answer === 'No' ? '#dc2626' : '#e5e7eb'),
                                cursor: 'pointer'
                            }}>❌ No</button>
                        </>
                    )}

                    {question.type === 'thermometer' && (
                        <>
                            <button onClick={() => setAnswer('Closer')} style={{
                                padding: '15px', fontWeight: 'bold', fontSize: '16px', borderRadius: '8px',
                                background: answer === 'Closer' ? '#ef4444' : '#f3f4f6',
                                color: answer === 'Closer' ? 'white' : '#374151',
                                border: '3px solid ' + (answer === 'Closer' ? '#dc2626' : '#e5e7eb'),
                                cursor: 'pointer'
                            }}>🔥 Closer</button>
                            <button onClick={() => setAnswer('Farther')} style={{
                                padding: '15px', fontWeight: 'bold', fontSize: '16px', borderRadius: '8px',
                                background: answer === 'Farther' ? '#3b82f6' : '#f3f4f6',
                                color: answer === 'Farther' ? 'white' : '#374151',
                                border: '3px solid ' + (answer === 'Farther' ? '#2563eb' : '#e5e7eb'),
                                cursor: 'pointer'
                            }}>❄️ Farther</button>
                        </>
                    )}

                    {question.type === 'matching' && isDirectional && (
                        question.details.includes('north or south') ? (
                            <>
                                <button onClick={() => setAnswer('North')} style={{
                                    padding: '15px', fontWeight: 'bold', fontSize: '16px', borderRadius: '8px',
                                    background: answer === 'North' ? '#3b82f6' : '#f3f4f6',
                                    color: answer === 'North' ? 'white' : '#374151',
                                    border: '3px solid ' + (answer === 'North' ? '#2563eb' : '#e5e7eb'),
                                    cursor: 'pointer'
                                }}>⬆️ North</button>
                                <button onClick={() => setAnswer('South')} style={{
                                    padding: '15px', fontWeight: 'bold', fontSize: '16px', borderRadius: '8px',
                                    background: answer === 'South' ? '#3b82f6' : '#f3f4f6',
                                    color: answer === 'South' ? 'white' : '#374151',
                                    border: '3px solid ' + (answer === 'South' ? '#2563eb' : '#e5e7eb'),
                                    cursor: 'pointer'
                                }}>⬇️ South</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setAnswer('East')} style={{
                                    padding: '15px', fontWeight: 'bold', fontSize: '16px', borderRadius: '8px',
                                    background: answer === 'East' ? '#3b82f6' : '#f3f4f6',
                                    color: answer === 'East' ? 'white' : '#374151',
                                    border: '3px solid ' + (answer === 'East' ? '#2563eb' : '#e5e7eb'),
                                    cursor: 'pointer'
                                }}>➡️ East</button>
                                <button onClick={() => setAnswer('West')} style={{
                                    padding: '15px', fontWeight: 'bold', fontSize: '16px', borderRadius: '8px',
                                    background: answer === 'West' ? '#3b82f6' : '#f3f4f6',
                                    color: answer === 'West' ? 'white' : '#374151',
                                    border: '3px solid ' + (answer === 'West' ? '#2563eb' : '#e5e7eb'),
                                    cursor: 'pointer'
                                }}>⬅️ West</button>
                            </>
                        )
                    )}

                    {question.type === 'matching' && !isDirectional && (
                        <>
                            <button onClick={() => setAnswer('Yes')} style={{
                                padding: '15px', fontWeight: 'bold', fontSize: '16px', borderRadius: '8px',
                                background: answer === 'Yes' ? '#10b981' : '#f3f4f6',
                                color: answer === 'Yes' ? 'white' : '#374151',
                                border: '3px solid ' + (answer === 'Yes' ? '#059669' : '#e5e7eb'),
                                cursor: 'pointer'
                            }}>✅ Yes</button>
                            <button onClick={() => setAnswer('No')} style={{
                                padding: '15px', fontWeight: 'bold', fontSize: '16px', borderRadius: '8px',
                                background: answer === 'No' ? '#ef4444' : '#f3f4f6',
                                color: answer === 'No' ? 'white' : '#374151',
                                border: '3px solid ' + (answer === 'No' ? '#dc2626' : '#e5e7eb'),
                                cursor: 'pointer'
                            }}>❌ No</button>
                        </>
                    )}
                </div>

                <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                    <button className="button button-secondary" onClick={onCancel} style={{flex: 1}}>Cancel</button>
                    <button className="button button-primary" onClick={() => answer && onSubmit(answer)} disabled={!answer} style={{flex: 1}}>
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
}

const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
    .pulse-marker {
        animation: pulse 1.5s ease-in-out infinite;
    }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
