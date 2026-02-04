# 🎮 Jet Lag: Nottingham - UPDATED VERSION

**NEW FEATURE:** Click-to-ask questions with automatic area elimination!

---

## 🆕 What's New?

### Strategic Question Placement
- **Click anywhere on the map** to place your question
- No longer uses your GPS position - you choose where to ask from!
- Perfect for strategic planning and elimination

### Automatic Area Shading
- **Map automatically shades ruled-out areas** based on answers
- Red shading = Hider is NOT here
- Green shading = Hider is NOT beyond this boundary
- Visual elimination makes finding the hider much easier!

### Answer Recording
- After placing a question, you get an answer modal
- Choose: Yes/No, Warmer/Colder, Same/Different, etc.
- Answers are saved and displayed in question history

---

## 📱 What You Need

**For Seekers:**
- `seeker.html`
- `seeker-app.js`

**For Hiders:**
- `hider.html`
- `hider-app.js` (unchanged)

---

## 🎯 How to Play (UPDATED)

### Setup:
1. **Seeker** opens seeker.html on their phone
2. **Hider** opens hider.html on their phone
3. Both click "Start" to begin
4. Hider goes to hide (near a pub in Nottingham)

### During Game (NEW WORKFLOW):

**Seeker:**
1. Tap a question card (Radar, Matching, etc.)
2. **Click on the map** where you want to ask the question from
3. Fill in details (e.g., "Are you within 1 mile of THIS point?")
4. **Send the question** to hider via WhatsApp/Snap
5. Wait for their verbal answer
6. **Select their answer** in the app (Yes/No, etc.)
7. **Watch the map automatically shade** ruled-out areas! ✨

**Hider:**
1. Receive question via WhatsApp/Snap
2. Answer the question verbally
3. In the app: Tap "Seeker Asked a Question"
4. Select which question type it was
5. **Automatically draws a random card!**
6. Max 6 cards in hand (discard extras)

### Ending:
- When seeker finds hider (line-of-sight)
- Hider taps "I've Been Caught!"
- See final score

---

## 🗺️ NEW: How Area Shading Works

### Radar Questions:
**Example:** "Are you within 1 mile of this point?"

- **Answer: NO** → Red circle shades the area (hider is NOT here)
- **Answer: YES** → Green shading OUTSIDE the circle (hider is NOT beyond)

### Thermometer Questions:
**Example:** "Am I warmer or colder than before?"

- **Warmer** → Shows red marker (you're getting closer)
- **Colder** → Shows blue marker (you're getting further)

### Matching Questions:
**Example:** "Is your nearest pub the same as mine?"

- Records answer but doesn't shade (use for intel gathering)

### Measuring Questions:
**Example:** "Are you closer to the Castle than me?"

- Records answer (future update will add shading)

### Photo Questions:
- No shading, just for gathering visual clues

---

## 💡 Strategy Tips (UPDATED)

### For Seekers:
- **Start with wide Radar questions** (5 mi, 3 mi)
- **Place questions strategically** - don't just click randomly!
- **Use overlapping circles** to narrow down the area
- **Watch the shaded areas** - the white space is where they are!
- Combine Radar (for elimination) + Photo (for confirmation)
- Use Thermometer to verify you're heading the right way

### For Hiders:
- Answer **honestly** (that's the honor system!)
- Collect **Time bonus** cards for higher score
- Use **Veto** on dangerous questions
- Keep hand at 5-6 cards
- Stay near pubs for easier questions

---

## 🎮 Example Game Flow (NEW)

### Start (00:00)
- Seeker at Old Market Square
- Hider hiding near The Bodega pub

### 5 minutes (00:05)
- **Seeker:** Clicks on city center, uses Radar (3 mi)
- **Seeker:** Asks "Are you within 3 miles of THIS point?"
- **Hider:** Answers "Yes"
- **Seeker:** Selects "Yes" in app
- **Map:** Shades everywhere OUTSIDE 3 miles in green
- **Hider:** Draws "Veto" card

### 12 minutes (00:12)
- **Seeker:** Clicks north of center, uses Radar (1 mi)
- **Seeker:** Asks "Are you within 1 mile of THIS point?"
- **Hider:** Answers "No"
- **Seeker:** Selects "No" in app
- **Map:** Shades red circle (NOT in this area)
- **Hider:** Draws "Time +10min" card

### 20 minutes (00:20)
- **Seeker:** Clicks near Lace Market, uses Radar (½ mi)
- **Hider:** Answers "Yes"
- **Map:** Now shows TWO overlapping zones!
- Area of interest is getting smaller! ✨

### 30 minutes (00:30)
- **Seeker:** Uses Photo question
- **Hider:** Sends photo of red brick wall
- Seeker recognizes the location!

### 35 minutes (00:35)
- **Seeker:** Finds hider visually!
- **Game Over**

### Final Score:
- Hunt time: 35 minutes
- Time bonuses: +10 minutes
- **Total: 45 minutes** 🏆

---

## 🎨 NEW UI Features

- **Pulsing marker** shows where you're about to ask a question
- **Color-coded question cards** light up when selected
- **"Cancel" button** to deselect a question type
- **Clear Shading button** to clean up the map if it gets messy
- **Question history** shows answers for reference
- **Visual feedback** on all interactions

---

## 🔧 Technical Notes

### For the Seeker App:
- Click a question card to enter "placement mode"
- Click the map to place the question
- Modal appears to confirm details
- After sending question to hider, enter their answer
- Map automatically calculates and shades elimination zones

### Shading Calculation:
- **Radar "No"**: Simple circle (hider NOT within radius)
- **Radar "Yes"**: Donut polygon (hider NOT beyond radius)
- **Thermometer**: Directional markers
- Uses Leaflet polygon and circle layers
- All areas stored and can be cleared

---

## 🚀 Upload to GitHub Pages

Same process as before:
1. Upload all 4 files to GitHub
2. Enable GitHub Pages
3. Share the links!

---

## ✨ Why This Is Better

### Old Way:
- Used your GPS position (had to physically move)
- No visual feedback on elimination
- Had to remember what areas were ruled out

### New Way:
- **Strategic placement** - think before you ask!
- **Visual elimination** - see what's ruled out instantly
- **Faster gameplay** - don't need to walk everywhere
- **More tactical** - overlap questions to narrow down
- **Honor system** - trust your friends to answer honestly!

---

## 🎊 You're Ready!

Upload the new files and start playing with **area elimination**! 

The map becomes a powerful tool for finding the hider through strategic questioning and visual elimination. Way more fun! 🎯

Have fun! 🚌🍺🗺️
