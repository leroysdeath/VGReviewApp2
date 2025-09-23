# PWA & Security Quick Reference Guide

## 🚀 Quick Status Check

### PWA Checklist
```bash
# Check if PWA is working
1. Open Chrome DevTools → Application → Manifest
2. Look for "Installable" ✓
3. Check Service Workers → should show "activated and running"
4. Try installing: Chrome menu → Install GameVault...
```

### Security Headers Check
```bash
# Check security headers
curl -I https://your-site.netlify.app | grep -E "Content-Security|X-Frame|Strict-Transport"
```

---

## 📁 Key Files & Their Purpose

| File | Purpose | When to Edit |
|------|---------|--------------|
| `/public/manifest.json` | PWA configuration | App name, icons, colors change |
| `/index.html` | Meta tags, manifest link | SEO updates, new meta tags |
| `/public/sw.js` | Service Worker caching | Cache strategy changes |
| `/netlify.toml` | Security headers, CSP | New domains, security policies |

---

## 🎨 Branding Configuration

### Current Settings
- **App Name**: GameVault
- **Theme Color**: `#9333ea` (Purple)
- **Background**: `#111827` (Dark Gray)

### To Change Branding
1. Update `/public/manifest.json`:
   ```json
   "name": "Your App Name",
   "short_name": "YourApp",
   "theme_color": "#yourcolor"
   ```

2. Update `/index.html`:
   ```html
   <meta name="theme-color" content="#yourcolor">
   <meta name="apple-mobile-web-app-title" content="YourApp">
   ```

---

## 🔒 CSP Quick Guide

### Current Allowed Domains

**Scripts**:
- Self
- `*.supabase.co`
- `googletagmanager.com`
- `google-analytics.com`

**Images**:
- All HTTPS sources
- Data URIs
- Blob URLs

**Connections**:
- `*.supabase.co`
- `api.igdb.com`
- `images.igdb.com`

### Adding New Service
```toml
# In netlify.toml, find Content-Security-Policy
# Add to appropriate directive:
connect-src 'self' https://your-new-api.com;
```

---

## 🐛 Troubleshooting

### PWA Not Installing?
1. **Check HTTPS**: PWA requires HTTPS (except localhost)
2. **Check Manifest**: All required fields present?
3. **Check Icons**: At least 192x192 and 512x512 icons exist?
4. **Check Service Worker**: Is it registered and active?

### CSP Violations?
1. **Check Console**: Look for CSP violation messages
2. **Identify Domain**: What domain is being blocked?
3. **Update CSP**: Add domain to appropriate directive
4. **Test Locally**: Use browser extension to test CSP

### Service Worker Not Updating?
1. **Clear Cache**: Chrome DevTools → Application → Clear Storage
2. **Hard Reload**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. **Update & Activate**: In Service Workers, click "Update" then "Activate"

---

## 📊 Monitoring

### Check PWA Status
```javascript
// In browser console
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW Status:', reg?.active?.state);
  console.log('SW Scope:', reg?.scope);
});
```

### Check CSP Active
```javascript
// In browser console
console.log('CSP Active:', document.querySelector('meta[http-equiv="Content-Security-Policy"]') ? 'Yes' : 'Check Network Headers');
```

---

## 🚢 Deployment Checklist

Before deploying PWA/Security changes:

- [ ] Icons exist in `/public/icons/` directory
- [ ] Manifest.json validates (use online validator)
- [ ] Service Worker version bumped
- [ ] CSP tested with all features
- [ ] No console errors in production build
- [ ] Lighthouse audit run locally

---

## 🔄 Version Management

### Current Versions
- **Service Worker**: `gamevault-v1.0.2`
- **Dynamic Cache**: `gamevault-dynamic-v1.0.2`

### To Update Version
1. Edit `/public/sw.js`:
   ```javascript
   const CACHE_NAME = 'gamevault-v1.0.3';  // Increment
   const DYNAMIC_CACHE = 'gamevault-dynamic-v1.0.3';
   ```

2. This triggers:
   - Old cache cleanup
   - Fresh asset caching
   - Service Worker update

---

## 📱 Platform-Specific Notes

### iOS/Safari
- Requires apple-touch-icon
- Status bar style affects PWA header
- No install prompt (use Safari → Share → Add to Home Screen)

### Android/Chrome
- Uses maskable icons for adaptive icons
- Shows install prompt automatically
- Supports shortcuts from home screen

### Desktop/Edge/Chrome
- Shows install button in address bar
- Supports window controls overlay
- Can set as default handler for game:// URLs (future)

---

## 🎯 Quick Wins

### Improve PWA Experience
1. Add more shortcuts to manifest
2. Add screenshots for app store-like install
3. Implement offline page with game

### Enhance Security
1. Remove 'unsafe-inline' from CSP (requires refactoring)
2. Add CSP report-uri for violation monitoring
3. Implement Subresource Integrity (SRI) for CDN resources

---

## 📞 Support Resources

### Documentation
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev PWA](https://web.dev/progressive-web-apps/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)

### Testing Tools
- [Manifest Validator](https://manifest-validator.appspot.com/)
- [Security Headers](https://securityheaders.com/)
- [PWA Builder](https://www.pwabuilder.com/)

---

## 🔮 Future Enhancements

**Coming in Phase 3:**
- WebP/AVIF image support
- Responsive images
- Image optimization pipeline

**Coming in Phase 4:**
- All icon sizes auto-generation
- iOS splash screens
- Dynamic shortcuts
- Push notifications