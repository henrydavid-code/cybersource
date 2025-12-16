# Render Deployment Fix

## Issue
Build fails with: `sh: 1: react-scripts: not found`

## Solution

The build command **must** include `npm install` before `npm run build`.

### Option 1: Update in Render Dashboard

1. Go to your Render service
2. Go to **Settings** → **Build & Deploy**
3. Update **Build Command** to:
   ```
   npm install && npm run build
   ```
4. Click **Save Changes**
5. Trigger a new deploy

### Option 2: Use render.yaml (Recommended)

The `render.yaml` file already has the correct build command:
```yaml
buildCommand: npm ci && npm run build
```

Make sure Render is using this file:
1. Go to **Settings** → **Build & Deploy**
2. Check **Auto-Deploy** is enabled
3. Ensure the repository is connected
4. Render should automatically detect and use `render.yaml`

### Option 3: Manual Build Command

If the above don't work, try:
```
npm install && CI=false npm run build
```

Or use npx explicitly:
```
npm install && npx react-scripts build
```

### Option 4: Check Node Version

Make sure Render is using Node.js 18 or 20:
1. Go to **Settings** → **Build & Deploy**
2. Set **Node Version** to `20` or `18`
3. Redeploy

## Verify

After updating, check the build logs. You should see:
1. ✅ `npm install` or `npm ci` running
2. ✅ Dependencies installing
3. ✅ `react-scripts build` running
4. ✅ Build output in `build/` directory

## Common Issues

- **"react-scripts: not found"** → Build command missing `npm install`
- **"Cannot find module"** → Dependencies not installed
- **Build timeout** → Try `npm ci` instead of `npm install` (faster)

