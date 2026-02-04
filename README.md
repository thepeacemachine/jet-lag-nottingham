# 🎮 Jet Lag: Nottingham Edition

A mobile-friendly hide and seek game inspired by Jet Lag: The Game, adapted for playing in Nottingham!

## 🚀 Quick Start (GitHub Pages)

### Step 1: Upload to GitHub
1. Go to your repository: https://thepeacemachine.github.io/Hide-and-seek-game/
2. Click "Add file" → "Upload files"
3. Drag and drop these files:
   - `index.html`
   - `app.js`
4. Scroll down and click "Commit changes"

### Step 2: Enable GitHub Pages
1. Go to **Settings** → **Pages** (in your repository)
2. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**
3. Click **Save**
4. Wait 2-3 minutes for deployment

### Step 3: Access Your Game
Your game will be live at:
```
https://thespacemachine.github.io/Hide-and-seek-game/
```

Share this link with your friends - they just click and play!

---

## 📱 How to Play

### Game Setup
1. **All players** open the game link on their phones
2. Choose number of players (4 or 5)
3. Select your role:
   - **Hider**: Find a pub and hide nearby
   - **Seeker**: Hunt down the hider

### Game Flow

#### Phase 1: Hiding (60 minutes)
- **Hider**: Find a pub in Nottingham and stay within walking distance (~300-500m)
- **Seekers**: Wait at starting location
- Timer counts down from 60:00

#### Phase 2: Hunting (Until caught)
- **Seekers** use question cards to locate the hider
- **Hider** draws cards after each question
- Game ends when seeker gets line-of-sight on hider

### Seeker Question Cards

**MATCHING** (3 uses)
- Ask if hider's nearest landmark matches yours
- Example: "Is your nearest tram stop the same as mine?"

**MEASURING** (3 uses)
- Check if hider is closer/further to a location
- Example: "Are you closer to Nottingham Castle than me?"

**RADAR** (2 uses)
- Ask if hider is within X distance
- Distances: 5mi, 3mi, 1mi, ½mi, ¼mi, or custom

**THERMOMETER** (2 uses)
- After moving 100m, get "warmer" or "colder" feedback

**PHOTO** (1 use)
- Request photo of something hider can see
- Example: "Send a photo of the tallest building visible"

### Hider Defense Cards

Cards you draw after answering questions:

- **Veto**: Cancel a seeker's question (they lose it!)
- **Time +5/10/15/20 minutes**: Added to your final score
- **Duplicate**: Copy another card in your hand

**Hand limit**: 6 cards maximum (discard extras)

### Scoring

**Hider's Score** = Hunting Time + Time Bonus Cards

The longer you survive, the higher your score!

---

## 🎯 Game Modes

### 4 Players
- 1 Hider vs 3 Seekers
- All seekers can see each other's locations
- Seekers work together

### 5 Players
- 1 Hider vs 2 Teams of 2 Seekers
- Teams **cannot** see each other
- Teams can choose to cooperate or compete

---

## 📍 GPS & Map Features

### What the Map Shows:
- **Your location** (red marker if hider, blue if seeker)
- **Live GPS tracking** with accuracy indicator
- **Nottingham streets** via OpenStreetMap
- **Real-time updates** as you move

### Visibility Rules:
- **Hider sees**: All seekers at all times
- **Seekers see**: Only their teammates (in 5-player mode)
- **Teams don't see**: Each other (in 5-player mode)

### Tips:
- Allow location permissions when prompted
- Best accuracy outdoors with clear sky
- Works on any mobile browser (no app needed!)

---

## 🔧 Technical Details

### Requirements:
- Modern smartphone with GPS
- Web browser (Chrome, Safari, Firefox, etc.)
- Internet connection (for initial load and map tiles)
- Location permissions enabled

### Built With:
- React 18
- Leaflet (for maps)
- OpenStreetMap tiles
- HTML5 Geolocation API

---

## 🐛 Troubleshooting

### Blank screen?
1. Hard refresh: Hold Shift + Click reload
2. Try incognito/private mode
3. Check browser console (F12) for errors

### GPS not working?
1. Check location permissions in browser settings
2. Try outdoors (GPS struggles indoors)
3. Restart the app

### Map not loading?
1. Check internet connection
2. Wait a few seconds for tiles to load
3. Try zooming in/out

### Game not deploying?
1. Make sure both `index.html` and `app.js` are uploaded
2. Check GitHub Pages is enabled (Settings → Pages)
3. Wait 5 minutes and try again

---

## 🎨 Customization Ideas

Want to modify the game? Here are some easy tweaks:

### Change Hiding Time
In `app.js`, find:
```javascript
const [hidingTimeLeft, setHidingTimeLeft] = useState(60 * 60);
```
Change `60 * 60` to your desired seconds (e.g., `30 * 60` for 30 minutes)

### Adjust Pub Distance
The "walking distance" is currently ~300-500m - modify as needed based on your area

### Add More Card Types
In `app.js`, find `HIDER_CARD_TYPES` array and add your own cards!

---

## 📞 Support

Having issues? Check these:
- Browser console errors (F12 → Console tab)
- GitHub Pages deployment status
- GPS permissions in phone settings

---

## 📜 License

This is a fan-made game inspired by Jet Lag: The Game. 
For personal, non-commercial use only.

Original concept by Wendover Productions.

---

## 🎮 Have Fun!

Enjoy your Nottingham hide and seek adventure! 

Remember: It's all about the journey (and the bus routes) 🚌
