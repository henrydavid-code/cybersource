# Unified Checkout Test - Static Website

A simple static HTML website for testing CyberSource Unified Checkout with 3D Secure authentication.

## Features

- ✅ Pure HTML/CSS/JavaScript (no build step required)
- ✅ Tailwind CSS for styling
- ✅ Initialize Unified Checkout capture context
- ✅ Display payment form using CyberSource Unified Checkout
- ✅ Process payments with transient tokens
- ✅ Test 3D Secure authentication flow
- ✅ Deploy to Render.com as static site

## Local Development

1. Open `index.html` in a web browser
   - Or use a local server:
   ```bash
   # Python
   python -m http.server 8000
   
   # Node.js
   npx http-server
   ```

2. Update `app.js` if needed:
   ```javascript
   const API_BASE_URL = 'https://card-payment-hso8.onrender.com';
   ```

3. Open [http://localhost:8000](http://localhost:8000)

## Deploy to Render.com

### Option 1: Using Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Static Site"
3. Connect your Git repository (or upload files)
4. Configure:
   - **Name**: `unified-checkout-test` (or your choice)
   - **Build Command**: `echo "No build needed"` (or leave empty)
   - **Publish Directory**: `.` (current directory)
   - **Environment Variables** (optional):
     - `REACT_APP_API_URL`: Your backend API URL

5. Click "Create Static Site"
6. Render will provide a URL like: `https://unified-checkout-test.onrender.com`

### Option 2: Using render.yaml

The `render.yaml` file is already configured. Just connect your Git repository and Render will use it automatically.

## Configuration

### Backend API URL

Update the `API_BASE_URL` in `app.js`:

```javascript
const API_BASE_URL = 'https://card-payment-hso8.onrender.com';
```

### Target Origins

The app automatically uses `window.location.origin` as the target origin for Unified Checkout. This ensures the origin matches your deployed URL.

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
├── index.html          # Main HTML file
├── app.js             # JavaScript for Unified Checkout
├── render.yaml        # Render.com deployment config
└── README.md          # This file
```

## License

MIT

