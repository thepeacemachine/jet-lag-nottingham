# 🔧 Troubleshooting & Testing Guide

## Before Deployment - Local Testing

### Test 1: Basic HTML Loading
1. Download `index.html` to your computer
2. Double-click to open in browser
3. **Expected**: You should see the purple gradient header and white content area
4. **If blank**: Check browser console (F12) for JavaScript errors

### Test 2: React Loading
1. Open browser console (F12)
2. Look for any red error messages
3. **Expected**: No errors, game setup screen visible
4. **If errors**: They'll usually say what's wrong

### Test 3: GPS Permissions
1. When game starts, browser will ask for location access
2. Click "Allow"
3. **Expected**: Green GPS status bar appears
4. **If denied**: Reload page and allow when prompted

---

## After GitHub Deployment

### Check 1: Files Uploaded Correctly
Go to: `https://github.com/thespacemachine/Hide-and-seek-game`

You should see:
- ✅ index.html (7-8 KB)
- ✅ app.js (19-20 KB)
- ✅ README.md (optional)

**Missing files?** Upload them again via "Add file" → "Upload files"

### Check 2: GitHub Pages is Enabled
Go to: `Settings` → `Pages`

Should show:
```
✅ Your site is live at https://thespacemachine.github.io/Hide-and-seek-game/
```

**Not enabled?**
1. Under "Build and deployment"
2. Source: **Deploy from a branch**
3. Branch: **main** (or master)
4. Folder: **/ (root)**
5. Click **Save**

### Check 3: Wait for Build
- Initial deployment takes 2-5 minutes
- Subsequent updates take 1-2 minutes
- Check back after waiting

---

## Common Issues & Fixes

### Issue: Blank White Screen

**Causes:**
1. JavaScript not loading
2. React CDN blocked
3. Browser compatibility

**Fixes:**
- **Hard refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- **Clear cache**: Settings → Privacy → Clear browsing data
- **Try different browser**: Chrome works best
- **Check console**: F12 → Console tab for specific errors

### Issue: "Failed to load resource" errors

**Cause**: CDN libraries (React, Leaflet) not loading

**Fix:**
- Check internet connection
- Try on different network (mobile data vs WiFi)
- Wait and refresh - CDNs occasionally have delays

### Issue: Map Not Showing

**Possible causes:**
1. Leaflet CSS not loaded
2. Map container height not set
3. Internet connection

**Fixes:**
- Check if you see a grey square where map should be
- Open console, look for Leaflet errors
- Check internet connection
- Zoom in/out on map area

### Issue: GPS Not Working

**On Phone:**
1. Settings → [Your Browser] → Location → Allow
2. Make sure Location Services is enabled (Phone Settings)
3. Try outdoors (GPS struggles indoors)

**On Desktop:**
1. Browser doesn't have GPS but can use WiFi location
2. Click allow when prompted
3. Won't be as accurate as phone GPS

### Issue: "Cannot read property of undefined"

**Cause**: React state error

**Fix:**
- Refresh the page
- Clear browser cache
- Check for `null` errors in console

---

## Testing Checklist

### Desktop Testing
- [ ] Page loads (no blank screen)
- [ ] Can select player count and role
- [ ] Start Game button works
- [ ] Timer appears and counts
- [ ] Map displays (even if location is inaccurate)

### Mobile Testing
- [ ] Page is responsive (fits screen)
- [ ] Buttons are tappable
- [ ] GPS permission prompt appears
- [ ] Location updates on map
- [ ] Cards are visible and clickable
- [ ] Modal dialogs work

### Multiplayer Testing
- [ ] Multiple people can access link simultaneously
- [ ] Each person sees their own game state
- [ ] Different roles work independently

---

## Emergency Backup Plan

If GitHub Pages completely fails, you can share the files directly:

1. Send `index.html` via WhatsApp/email
2. Friends open it in their phone browser
3. Works offline after first load (except map tiles)

**Limitation**: No shared state between players - everyone runs independently

---

## Performance Tips

### For Better GPS Accuracy:
- Play outdoors when possible
- Allow high-accuracy location
- Give GPS 30 seconds to get initial fix
- Move around if stuck on one spot

### For Faster Loading:
- Use WiFi for initial load
- Let page fully load before starting game
- Don't force refresh repeatedly

### Battery Saving:
- GPS drains battery fast
- Consider bringing a power bank
- Close other apps running GPS

---

## Developer Console Commands

Open console (F12) and try these to debug:

```javascript
// Check if React loaded
typeof React !== 'undefined'

// Check if map loaded
typeof L !== 'undefined'

// Check GPS support
'geolocation' in navigator

// Force get current location
navigator.geolocation.getCurrentPosition(
  (pos) => console.log(pos.coords),
  (err) => console.error(err)
)
```

---

## Still Not Working?

### Last Resort Fixes:

1. **Delete and re-upload files**
   - Remove old files from GitHub
   - Upload fresh copies
   - Wait 5 minutes

2. **Try a different repository**
   - Create new repo
   - Upload files there
   - New GitHub Pages URL

3. **Use GitHub Desktop app**
   - Easier file management
   - Better sync control

4. **Contact GitHub Support**
   - If Pages won't deploy
   - Check GitHub status page first

---

## Success Indicators

You know it's working when:
- ✅ Setup screen appears with purple header
- ✅ Dropdown menus work
- ✅ "Start Game" button responds
- ✅ Timer appears and changes
- ✅ Map shows with tiles
- ✅ GPS status shows your location
- ✅ Question cards are clickable

---

## Testing Workflow

### For You (Before Friends Join):
1. Open link on your phone
2. Allow GPS permissions
3. Choose role and start game
4. Walk around - watch location update
5. Test clicking each card type
6. Try the modal dialogs

### With One Friend:
1. Both open link
2. One chooses hider, one seeker
3. Both start game
4. Check GPS shows on map
5. Seeker tries asking a question
6. Hider practices answering

### Full Game Test:
1. Everyone opens link
2. Assign roles
3. Start together
4. Play a quick 5-minute test round
5. Note any issues
6. Fix before real game

---

Good luck! The most common issue is forgetting to wait for GitHub Pages to build. Be patient! 🎮
