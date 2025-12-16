# Unified Checkout Test - React App

A simple React single-page application for testing CyberSource Unified Checkout with 3D Secure authentication.

## Features

- Initialize Unified Checkout capture context
- Display payment form using CyberSource Unified Checkout
- Process payments with transient tokens
- Test 3D Secure authentication flow
- Deploy to Render.com for proper HTTPS domain

## Prerequisites

- Node.js 14+ and npm
- CyberSource backend API running (e.g., `https://card-payment-hso8.onrender.com`)
- CyberSource merchant account configured

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Set environment variable (optional, defaults to Render URL):
```bash
# Copy the example file
cp .env.example .env

# Or create manually
echo "REACT_APP_API_URL=https://card-payment-hso8.onrender.com" > .env
```

3. Start development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deploy to Render.com

### Option 1: Using Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Static Site"
3. Connect your Git repository (or upload files)
4. Configure:
   - **Name**: `unified-checkout-test` (or your choice)
   - **Build Command**: `npm install && npm run build` ⚠️ **IMPORTANT: Must include `npm install`**
   - **Publish Directory**: `build`
   - **Environment Variables** (if needed):
     - `REACT_APP_API_URL`: Your backend API URL (e.g., `https://card-payment-hso8.onrender.com`)

5. Click "Create Static Site"
6. Render will provide a URL like: `https://unified-checkout-test.onrender.com`

### Option 2: Using render.yaml

Create a `render.yaml` file in the root:

```yaml
services:
  - type: web
    name: unified-checkout-test
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./build
    envVars:
      - key: REACT_APP_API_URL
        value: https://card-payment-hso8.onrender.com
```

Then deploy via Render CLI or dashboard.

## Configuration

### Backend API URL

Update the `API_BASE_URL` in `src/App.js` or set `REACT_APP_API_URL` environment variable:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://card-payment-hso8.onrender.com';
```

### Target Origins

The app automatically uses `window.location.origin` as the target origin for Unified Checkout. This ensures the origin matches the deployed URL.

## Testing 3D Secure

1. Deploy the app to Render.com to get a proper HTTPS URL
2. Update your CyberSource merchant account with the website URL:
   - Format: `https://your-app.onrender.com` (or your custom domain)
   - In CyberSource Business Center → Merchant Settings → Website URL
3. Initialize payment form with test amount
4. Use test cards that trigger 3D Secure:
   - Visa: `4000000000000002` (challenge required)
   - Mastercard: `5200828282828210` (challenge required)
5. Complete the 3D Secure challenge when prompted

## Test Cards

- **Visa Success**: `4111111111111111`
- **Visa 3DS Challenge**: `4000000000000002`
- **Mastercard Success**: `5555555555554444`
- **Mastercard 3DS Challenge**: `5200828282828210`

## Troubleshooting

### "COMPLETE_AUTHENTICATION_CANCELED" Error

- Ensure your merchant website URL is registered in CyberSource Business Center
- Website URL format should be: `https://www.example.com` or `https://your-app.onrender.com`
- Verify `targetOrigins` in capture context matches the deployed URL

### Payment Form Not Loading

- Check browser console for errors
- Verify backend API is accessible
- Ensure capture context is valid
- Check CORS settings on backend

### 3D Secure Not Triggering

- Verify Payer Authentication is enabled in CyberSource Business Center
- Use test cards that require 3D Secure challenge
- Check merchant account configuration

## Project Structure

```
unified-checkout-test/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── App.js              # Main app component
│   ├── App.css             # Styles
│   ├── index.js            # React entry point
│   └── index.css           # Global styles
├── package.json            # Dependencies
└── README.md              # This file
```

## License

MIT

