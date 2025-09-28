# Debug Mode Documentation

## Overview

Debug Mode provides additional technical information and developer tools throughout the VGReviewApp interface. When enabled, you'll see extra diagnostic information that's normally hidden from users.

## Features Available in Debug Mode

### Search Results Page
- **Source Badges**: Shows whether search results came from:
  - 🟢 **Database** - Local cached results (fast)
  - 🔵 **IGDB API** - Live API results (slower but fresher)
  - 🟣 **Mixed Sources** - Combination of both

## How to Enable Debug Mode

Debug Mode can be enabled in three ways:

### 1. URL Parameter (Temporary)
Add `?debug=true` to any page URL:
```
https://yoursite.com/search-results?q=zelda&debug=true
```
- ✅ Works immediately
- ✅ No console/code needed
- ❌ Only active for current page
- ❌ Lost on navigation

### 2. Browser Console (Persistent)
Open browser console (F12) and run:
```javascript
// Enable debug mode
localStorage.setItem('debugMode', 'true');

// Disable debug mode
localStorage.removeItem('debugMode');

// Check status
localStorage.getItem('debugMode');
```
- ✅ Persists across sessions
- ✅ Works on all pages
- ❌ Requires console access

### 3. Development Environment (Automatic)
Debug Mode is automatically enabled when running locally:
- `npm run dev`
- `netlify dev`
- Any localhost URL

## How to Disable Debug Mode

### If enabled via URL:
- Remove `?debug=true` from the URL
- Navigate to a different page

### If enabled via localStorage:
```javascript
localStorage.removeItem('debugMode');
```
Then refresh the page.

## Keyboard Shortcuts (Future Enhancement)

*Note: Not yet implemented*

Future versions may support:
- `Ctrl+Shift+D` - Toggle debug mode
- `Ctrl+Shift+I` - Show debug info panel

## Debug Information Examples

### Search Source Badge
```
[Database] - Results from local cache
[IGDB API] - Results from live API
[Mixed Sources] - Combined results
```

### Future Debug Features
Planned additions may include:
- Response times for API calls
- Cache hit/miss rates
- Number of results returned
- Query execution time
- Memory usage
- Component render counts

## Best Practices

1. **Production**: Keep debug mode OFF unless troubleshooting
2. **Development**: Use debug mode to verify data sources
3. **QA Testing**: Enable to reproduce reported issues
4. **Performance**: Monitor API vs cache usage patterns

## Security Note

Debug Mode only reveals technical metadata about the application's operation. It does not expose:
- User credentials
- API keys
- Private user data
- Database connection strings

## Troubleshooting

### Debug Mode Not Working?

1. **Check if already enabled**:
   ```javascript
   console.log('Debug mode:', localStorage.getItem('debugMode'));
   ```

2. **Clear and re-enable**:
   ```javascript
   localStorage.clear();
   localStorage.setItem('debugMode', 'true');
   location.reload();
   ```

3. **Check for conflicts**:
   - Ad blockers may interfere with localStorage
   - Incognito mode may not persist settings

### Still Need Help?

- Check browser console for errors
- Ensure JavaScript is enabled
- Try a different browser
- Report issues at: https://github.com/yourrepo/issues