const { useState, useEffect, useRef } = React;

// Card types and their configurations
const CARD_CONFIG = {
    matching: { 
        count: 5, 
        color: '#2c3e50', 
        label: 'MATCHING', 
        subtitle: 'DRAW 3, PICK 1',
        icon: '🎯',
        questions: [
            'Are you north or south of us?',
            'Are you east or west of us?',
            'Are you in the same civil parish as us?',
            'Are you on the same street as us?',
            'Are you at the same pub as us?'
        ]
    },
    radar: { 
        count: 5, 
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
const ENGLAND_BOUNDS = [
    [49.9, -6.4],
    [55.8, 1.8]
];

// Convert distance string to meters
function distanceToMeters(distStr) {
    if (distStr.includes('mi')) {
        const num = parseFloat(distStr.replace('½', '0.5').replace('¼', '0.25'));
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

// Calculate if point is within radius
function isWithinRadius(point1, point2, radiusMeters) {
    const R = 6371000; // Earth radius in meters
    const lat1 = point1.lat * Math.PI / 180;
    const lat2 = point2.lat * Math.PI / 180;
    const deltaLat = (point2.lat - point1.lat) * Math.PI / 180;
    const deltaLng = (point2.lng - point1.lng) * Math.PI / 180;
    
    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance <= radiusMeters;
}

function App() {
    const [gameStarted, setGameStarted] = useState(false);
    const [usedQuestions, setUsedQuestions] = useState({
        matching: [],
        radar: [],
        thermometer: [],
        photo: []
    });
    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState(null);
    const [selectedMapPoint, setSelectedMapPoint] = useState(null);
    const [pendingQuestion, setPendingQuestion] = useState(null);
    const [activeQuestionType, setActiveQuestionType] = useState(null);
    const [selectedQuestionDetails, setSelectedQuestionDetails] = useState(null);
    const [thermometerStartPoint, setThermometerStartPoint] = useState(null);
    
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const myMarkerRef = useRef(null);
    const questionMarkersRef = useRef([]);
    const shadedAreasRef = useRef([]);
    const tempMarkerRef = useRef(null);
    const watchIdRef = useRef(null);
    const englandMaskRef = useRef(null);

    useEffect(() => {
        if (gameStarted && mapRef.current && !mapInstanceRef.current) {
            const map = L.map(mapRef.current).setView(NOTTINGHAM_CENTER, 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);
            mapInstanceRef.current = map;
            
            // Add gray overlay outside England
            addEnglandMask();
        }
    }, [gameStarted]);

    function addEnglandMask() {
        if (!mapInstanceRef.current) return;
        
        // Create very large outer rectangle
        const worldBounds = [
            [-90, -180], [90, -180], [90, 180], [-90, 180], [-90, -180]
        ];
        
        // England bounds (approximate)
        const englandBounds = [
            [55.8, 1.8], [55.8, -6.4], [49.9, -6.4], [49.9, 1.8], [55.8, 1.8]
        ].reverse(); // Reverse to create hole
        
        const mask = L.polygon([worldBounds, englandBounds], {
            color: 'transparent',
            fillColor: '#95a5a6',
            fillOpacity: 0.6,
            weight: 0,
            interactive: false
        }).addTo(mapInstanceRef.current);
        
        englandMaskRef.current = mask;
    }

    useEffect(() => {
        if (!mapInstanceRef.current) return;
        
        // Remove old click handler
        mapInstanceRef.current.off('click');
        
        // Add new click handler if question type is active
        if (activeQuestionType && selectedQuestionDetails) {
            mapInstanceRef.current.on('click', (e) => {
                handleMapClick(e.latlng);
            });
        }
    }, [activeQuestionType, selectedQuestionDetails, thermometerStartPoint]);

    // GPS tracking removed - not needed for seeker app

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
        if (!activeQuestionType || !selectedQuestionDetails) return;
        
        // For Radar: Click to set YOUR location, then hider answers if they're within radius
        if (activeQuestionType === 'radar') {
            const clickedPoint = { lat: latlng.lat, lng: latlng.lng };
            
            // Just mark the question as asked and wait for hider's answer
            const question = {
                type: 'radar',
                details: selectedQuestionDetails,
                location: clickedPoint,
                timestamp: Date.now(),
                timeUsed: new Date().toLocaleTimeString(),
                answered: false // Will be answered manually
            };
            
            setPendingQuestion(question);
            setShowModal(true);
            setModalContent('answer');
            
            cancelSelection();
            return;
        }
        
        // For Thermometer: need two points
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
                setModalContent({ type: 'thermometer', action: 'answer' });
            }
        } else {
            // For Matching: single click then ask
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
            setModalContent({ type: activeQuestionType, action: 'answer' });
        }
    }

    function useQuestion(type, specificQuestion) {
        const alreadyUsed = usedQuestions[type].some(q => q.details === specificQuestion);
        if (alreadyUsed) return;
        
        // For photo questions, immediately show them
        if (type === 'photo') {
            setActiveQuestionType('photo');
            setShowModal(true);
            setModalContent({ type: 'photo', action: 'view' });
            return;
        }
        
        // Set as active question
        setActiveQuestionType(type);
        setSelectedQuestionDetails(specificQuestion);
        setSelectedMapPoint(null);
        setThermometerStartPoint(null);
        
        if (type === 'thermometer') {
            alert(`🌡️ Thermometer (${specificQuestion}):\n1. Click your STARTING point\n2. Click where you MOVED to\n3. Answer: Are you closer or farther?`);
        } else if (type === 'radar') {
            alert(`🎯 Radar (${specificQuestion}):\nClick on the map.\nI'll auto-calculate if it's within range from your GPS location!`);
        } else {
            alert(`📍 Click on the map where you want to ask:\n"${specificQuestion}"`);
        }
    }

    function cancelSelection() {
        setActiveQuestionType(null);
        setSelectedQuestionDetails(null);
        setThermometerStartPoint(null);
        setSelectedMapPoint(null);
        if (tempMarkerRef.current) {
            tempMarkerRef.current.remove();
            tempMarkerRef.current = null;
        }
    }

    function confirmPhotoQuestion(details) {
        const question = {
            type: 'photo',
            details: details,
            location: null,
            timestamp: Date.now(),
            timeUsed: new Date().toLocaleTimeString(),
            answered: true,
            answer: 'Sent'
        };
        
        setUsedQuestions(prev => ({
            ...prev,
            photo: [...prev.photo, question]
        }));
        
        setShowModal(false);
        setActiveQuestionType(null);
        alert('📸 Photo question sent! Hider will send you the photo via WhatsApp.');
    }

    function submitAnswer(answer) {
        if (!selectedMapPoint && activeQuestionType !== 'radar') {
            alert('Error: No location selected');
            return;
        }
        
        const question = {
            type: activeQuestionType,
            details: selectedQuestionDetails,
            location: selectedMapPoint,
            startLocation: thermometerStartPoint,
            timestamp: Date.now(),
            timeUsed: new Date().toLocaleTimeString(),
            answered: true,
            answer: answer
        };
        
        setUsedQuestions(prev => ({
            ...prev,
            [activeQuestionType]: [...prev[activeQuestionType], question]
        }));
        
        addQuestionMarker(question);
        addShadedArea(question);
        
        setShowModal(false);
        cancelSelection();
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
        }
    }

    function addShadedArea(question) {
        if (!mapInstanceRef.current || !question.location || !question.answered) return;
        
        const { type, location, answer, details, startLocation } = question;
        
        const stripedPattern = 'repeating-linear-gradient(45deg, rgba(149, 165, 166, 0.6), rgba(149, 165, 166, 0.6) 10px, rgba(149, 165, 166, 0.4) 10px, rgba(149, 165, 166, 0.4) 20px)';
        
        // Radar shading - striped gray circles
        if (type === 'radar') {
            const distance = distanceToMeters(details);
            
            const canvas = document.createElement('canvas');
            canvas.width = 40;
            canvas.height = 40;
            const ctx = canvas.getContext('2d');
            
            // Create diagonal stripes
            ctx.fillStyle = '#95a5a6';
            ctx.globalAlpha = 0.6;
            for (let i = -40; i < 80; i += 10) {
                ctx.fillRect(i, 0, 5, 40);
                ctx.save();
                ctx.translate(20, 20);
                ctx.rotate(45 * Math.PI / 180);
                ctx.translate(-20, -20);
                ctx.fillRect(i, 0, 5, 40);
                ctx.restore();
            }
            
            const pattern = ctx.createPattern(canvas, 'repeat');
            
            if (answer === 'No' || answer === 'Yes') {
                // Create SVG pattern for stripes
                const svgPattern = `
                    <svg width="100%" height="100%">
                        <defs>
                            <pattern id="stripe-${Date.now()}" patternUnits="userSpaceOnUse" width="20" height="20" patternTransform="rotate(45)">
                                <rect width="10" height="20" fill="rgba(149, 165, 166, 0.6)"/>
                            </pattern>
                        </defs>
                    </svg>
                `;
                
                if (answer === 'No') {
                    // Shade inside circle
                    const circle = L.circle([location.lat, location.lng], {
                        radius: distance,
                        color: '#7f8c8d',
                        fillColor: '#95a5a6',
                        fillOpacity: 0.5,
                        weight: 2,
                        className: 'striped-area'
                    }).addTo(mapInstanceRef.current);
                    circle.bindPopup(`❌ NOT within ${details}`);
                    shadedAreasRef.current.push(circle);
                } else {
                    // Shade outside circle (donut)
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
                        color: '#7f8c8d',
                        fillColor: '#95a5a6',
                        fillOpacity: 0.5,
                        weight: 2,
                        className: 'striped-area'
                    }).addTo(mapInstanceRef.current);
                    polygon.bindPopup(`❌ NOT beyond ${details}`);
                    shadedAreasRef.current.push(polygon);
                    
                    // Boundary circle
                    const boundaryCircle = L.circle([location.lat, location.lng], {
                        radius: distance,
                        color: '#7f8c8d',
                        fillColor: 'transparent',
                        fillOpacity: 0,
                        weight: 3
                    }).addTo(mapInstanceRef.current);
                    boundaryCircle.bindPopup(`Boundary: ${details}`);
                    shadedAreasRef.current.push(boundaryCircle);
                }
            }
        }
        
        // Matching shading - half-plane
        if (type === 'matching') {
            const isNorthSouth = details.includes('north or south');
            const isEastWest = details.includes('east or west');
            
            if (isNorthSouth || isEastWest) {
                const largeDistance = 50000;
                let bounds = [];
                
                if (isNorthSouth) {
                    if (answer === 'North') {
                        // Shade south
                        bounds = [
                            [location.lat - (largeDistance / 111000), location.lng - (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat - (largeDistance / 111000), location.lng + (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat, location.lng + (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat, location.lng - (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))]
                        ];
                    } else if (answer === 'South') {
                        // Shade north
                        bounds = [
                            [location.lat, location.lng - (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat, location.lng + (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat + (largeDistance / 111000), location.lng + (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat + (largeDistance / 111000), location.lng - (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))]
                        ];
                    }
                }
                
                if (isEastWest) {
                    if (answer === 'East') {
                        // Shade west
                        bounds = [
                            [location.lat - (largeDistance / 111000), location.lng - (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat + (largeDistance / 111000), location.lng - (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat + (largeDistance / 111000), location.lng],
                            [location.lat - (largeDistance / 111000), location.lng]
                        ];
                    } else if (answer === 'West') {
                        // Shade east
                        bounds = [
                            [location.lat - (largeDistance / 111000), location.lng],
                            [location.lat + (largeDistance / 111000), location.lng],
                            [location.lat + (largeDistance / 111000), location.lng + (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))],
                            [location.lat - (largeDistance / 111000), location.lng + (largeDistance / (111000 * Math.cos(location.lat * Math.PI / 180)))]
                        ];
                    }
                }
                
                if (bounds.length > 0) {
                    const poly = L.polygon(bounds, {
                        color: '#7f8c8d',
                        fillColor: '#95a5a6',
                        fillOpacity: 0.5,
                        weight: 2,
                        className: 'striped-area'
                    }).addTo(mapInstanceRef.current);
                    poly.bindPopup(`❌ NOT ${answer.toLowerCase()}`);
                    shadedAreasRef.current.push(poly);
                }
                
                // Draw dividing line
                const lineLen = 0.5;
                const linePoints = isNorthSouth 
                    ? [[location.lat, location.lng - lineLen], [location.lat, location.lng + lineLen]]
                    : [[location.lat - lineLen, location.lng], [location.lat + lineLen, location.lng]];
                const line = L.polyline(linePoints, {
                    color: '#2c3e50',
                    weight: 3
                }).addTo(mapInstanceRef.current);
                shadedAreasRef.current.push(line);
            }
        }
        
        // Thermometer shading - half-plane perpendicular to movement
        if (type === 'thermometer' && startLocation) {
            // Calculate vector from start to end
            const dx = location.lng - startLocation.lng;
            const dy = location.lat - startLocation.lat;
            
            // Midpoint
            const midLat = (startLocation.lat + location.lat) / 2;
            const midLng = (startLocation.lng + location.lng) / 2;
            
            // Perpendicular vector (rotated 90 degrees)
            const perpDx = -dy;
            const perpDy = dx;
            
            // Normalize
            const length = Math.sqrt(perpDx * perpDx + perpDy * perpDy);
            const normPerpDx = perpDx / length;
            const normPerpDy = perpDy / length;
            
            // Create perpendicular line extending far in both directions
            const lineExtent = 0.5;
            const perpLine = L.polyline([
                [midLat - normPerpDy * lineExtent, midLng - normPerpDx * lineExtent],
                [midLat + normPerpDy * lineExtent, midLng + normPerpDx * lineExtent]
            ], {
                color: '#f39c12',
                weight: 4
            }).addTo(mapInstanceRef.current);
            perpLine.bindPopup('Dividing line');
            shadedAreasRef.current.push(perpLine);
            
            // Shade half-plane
            const largeDistance = 50000;
            let halfPlane = [];
            
            if (answer === 'Closer') {
                // Shade the side AWAY from the hider (behind the end point)
                // The hider is on the far side
                halfPlane = [
                    [midLat - normPerpDy * lineExtent - normPerpDx * largeDistance, midLng - normPerpDx * lineExtent + normPerpDy * largeDistance],
                    [midLat + normPerpDy * lineExtent - normPerpDx * largeDistance, midLng + normPerpDx * lineExtent + normPerpDy * largeDistance],
                    [midLat + normPerpDy * lineExtent, midLng + normPerpDx * lineExtent],
                    [midLat - normPerpDy * lineExtent, midLng - normPerpDx * lineExtent]
                ];
            } else {
                // Shade the side towards the hider (ahead of the end point)
                halfPlane = [
                    [midLat - normPerpDy * lineExtent, midLng - normPerpDx * lineExtent],
                    [midLat + normPerpDy * lineExtent, midLng + normPerpDx * lineExtent],
                    [midLat + normPerpDy * lineExtent + normPerpDx * largeDistance, midLng + normPerpDx * lineExtent - normPerpDy * largeDistance],
                    [midLat - normPerpDy * lineExtent + normPerpDx * largeDistance, midLng - normPerpDx * lineExtent - normPerpDy * largeDistance]
                ];
            }
            
            const poly = L.polygon(halfPlane, {
                color: '#7f8c8d',
                fillColor: '#95a5a6',
                fillOpacity: 0.5,
                weight: 2,
                className: 'striped-area'
            }).addTo(mapInstanceRef.current);
            poly.bindPopup(answer === 'Closer' ? '❌ NOT this side (farther)' : '❌ NOT this side (closer)');
            shadedAreasRef.current.push(poly);
            
            // Draw movement line
            const line = L.polyline([
                [startLocation.lat, startLocation.lng],
                [location.lat, location.lng]
            ], {
                color: '#f39c12',
                weight: 3,
                dashArray: '10, 10'
            }).addTo(mapInstanceRef.current);
            shadedAreasRef.current.push(line);
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
            cancelSelection();
            
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
            if (englandMaskRef.current) {
                englandMaskRef.current.remove();
                englandMaskRef.current = null;
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

    function handleManualShade(location, radiusMiles) {
        if (!mapInstanceRef.current) return;
        
        const radiusMeters = radiusMiles * 1609.34;
        
        const circle = L.circle([location.lat, location.lng], {
            radius: radiusMeters,
            color: '#95a5a6',
            fillColor: '#95a5a6',
            fillOpacity: 0.4,
            weight: 2,
            className: 'striped-area'
        }).addTo(mapInstanceRef.current);
        
        shadedAreasRef.current.push(circle);
        setShowModal(false);
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
                        ? `${thermometerStartPoint ? 'Click END point' : `Click map: ${selectedQuestionDetails}`}` 
                        : 'Select a question card below'}
                </p>
            </div>

            <div className="content">
                <div className="map-container">
                    <div id="map" ref={mapRef}></div>
                </div>

                <div style={{marginTop: '20px'}}>
                    {Object.entries(CARD_CONFIG).map(([type, config]) => (
                        <QuestionCard
                            key={type}
                            type={type}
                            config={config}
                            usedQuestions={usedQuestions[type]}
                            activeQuestion={activeQuestionType === type ? selectedQuestionDetails : null}
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
                        {activeQuestionType === 'radar' && (
                            <>🎯 Click on the map - I'll auto-check if within {selectedQuestionDetails}</>
                        )}
                        {activeQuestionType === 'matching' && (
                            <>📍 Click the map to ask: "{selectedQuestionDetails}"</>
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

                <div style={{marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                    <button 
                        className="button button-primary"
                        onClick={() => {
                            setShowModal(true);
                            setModalContent('manualShade');
                        }}
                    >
                        ✏️ Manual Shade
                    </button>
                    <button 
                        className="button button-secondary"
                        onClick={clearShadedAreas}
                    >
                        Clear Shading
                    </button>
                </div>
                <div style={{marginTop: '10px'}}>
                    <button 
                        className="button button-secondary"
                        onClick={resetGame}
                        style={{width: '100%'}}
                    >
                        🔄 Reset Game
                    </button>
                </div>
            </div>

            {showModal && modalContent?.action === 'answer' && (
                <AnswerModal
                    question={{
                        type: activeQuestionType,
                        details: selectedQuestionDetails,
                        location: selectedMapPoint,
                        startLocation: thermometerStartPoint
                    }}
                    onSubmit={submitAnswer}
                    onCancel={cancelSelection}
                />
            )}

            {showModal && modalContent?.action === 'view' && (
                <PhotoListModal
                    usedQuestions={usedQuestions.photo}
                    onSelectPhoto={confirmPhotoQuestion}
                    onClose={() => {
                        setShowModal(false);
                        setActiveQuestionType(null);
                    }}
                />
            )}

            {showModal && modalContent === 'manualShade' && (
                <ManualShadeModal
                    onConfirm={handleManualShade}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    );
}

// Question Card Component
function QuestionCard({ type, config, usedQuestions, activeQuestion, onSelectQuestion }) {
    const remainingCount = config.count - usedQuestions.length;
    
    return (
        <div style={{marginBottom: '15px'}}>
            <div 
                style={{
                    background: config.color,
                    padding: '15px',
                    borderRadius: '10px 10px 0 0',
                    color: 'white'
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
                    const active = activeQuestion === q;
                    return (
                        <QuestionTile
                            key={idx}
                            used={used}
                            active={active}
                            icon={idx === 0 ? '✈️' : idx === 1 ? '🧭' : idx === 2 ? '🏘️' : idx === 3 ? '📮' : idx === 4 ? '🛣️' : '🍺'}
                            onClick={() => !used && onSelectQuestion(type, q)}
                        />
                    );
                })}
                
                {type === 'radar' && config.distances.map((d, idx) => {
                    const used = usedQuestions.some(uq => uq.details === d);
                    const active = activeQuestion === d;
                    return (
                        <QuestionTile
                            key={idx}
                            used={used}
                            active={active}
                            label={d}
                            onClick={() => !used && onSelectQuestion(type, d)}
                        />
                    );
                })}
                
                {type === 'thermometer' && config.distances.map((d, idx) => {
                    const used = usedQuestions.some(uq => uq.details.includes(d));
                    const active = activeQuestion && activeQuestion.includes(d);
                    return (
                        <QuestionTile
                            key={idx}
                            used={used}
                            active={active}
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
                            active={false}
                            icon={idx === 0 ? '🪧' : idx === 1 ? '🚦' : idx === 2 ? '🚏' : idx === 3 ? '🏢' : idx === 4 ? '🗿' : idx === 5 ? '🏘️' : idx === 6 ? '🛣️' : idx === 7 ? '☁️' : '⬇️'}
                            onClick={() => !used && onSelectQuestion(type, q)}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function QuestionTile({ used, active, icon, label, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                aspectRatio: '1',
                background: used ? '#d1d5db' : (active ? '#fbbf24' : '#fff'),
                border: active ? '3px solid #f59e0b' : '2px solid #e5e7eb',
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
                                onClick={() => !used && onSelectPhoto(q)}
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

function ManualShadeModal({ onConfirm, onClose }) {
    const [location, setLocation] = useState({ lat: 52.9548, lng: -1.1581 });
    const [radius, setRadius] = useState(1);

    return (
        <div className="modal">
            <div className="modal-content">
                <div className="modal-title">✏️ Manual Shading</div>
                
                <p style={{marginBottom: '15px', fontSize: '14px', color: '#6b7280'}}>
                    Click anywhere on the map or enter coordinates to shade an area.
                </p>

                <div style={{marginBottom: '15px'}}>
                    <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px'}}>
                        Latitude
                    </label>
                    <input
                        type="number"
                        step="0.0001"
                        value={location.lat}
                        onChange={(e) => setLocation({...location, lat: parseFloat(e.target.value)})}
                        className="text-input"
                        style={{marginTop: 0}}
                    />
                </div>

                <div style={{marginBottom: '15px'}}>
                    <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px'}}>
                        Longitude
                    </label>
                    <input
                        type="number"
                        step="0.0001"
                        value={location.lng}
                        onChange={(e) => setLocation({...location, lng: parseFloat(e.target.value)})}
                        className="text-input"
                        style={{marginTop: 0}}
                    />
                </div>

                <div style={{marginBottom: '15px'}}>
                    <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px'}}>
                        Radius (miles)
                    </label>
                    <select
                        value={radius}
                        onChange={(e) => setRadius(parseFloat(e.target.value))}
                        className="select-input"
                        style={{marginTop: 0}}
                    >
                        <option value={0.25}>¼ mile</option>
                        <option value={0.5}>½ mile</option>
                        <option value={1}>1 mile</option>
                        <option value={3}>3 miles</option>
                        <option value={5}>5 miles</option>
                    </select>
                </div>

                <div style={{background: '#f3f4f6', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px'}}>
                    <div><strong>Preview:</strong></div>
                    <div>Center: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</div>
                    <div>Radius: {radius} mile{radius !== 1 ? 's' : ''}</div>
                </div>

                <div style={{display: 'flex', gap: '10px'}}>
                    <button 
                        className="button button-secondary" 
                        onClick={onClose}
                        style={{flex: 1}}
                    >
                        Cancel
                    </button>
                    <button 
                        className="button button-primary" 
                        onClick={() => onConfirm(location, radius)}
                        style={{flex: 1}}
                    >
                        Add Shading
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
    .striped-area {
        background-image: repeating-linear-gradient(
            45deg,
            rgba(149, 165, 166, 0.6),
            rgba(149, 165, 166, 0.6) 10px,
            rgba(149, 165, 166, 0.4) 10px,
            rgba(149, 165, 166, 0.4) 20px
        ) !important;
    }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
