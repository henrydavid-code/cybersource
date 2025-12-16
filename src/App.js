import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

// Backend API URL - Update this to your Render.com backend URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://card-payment-hso8.onrender.com';

function App() {
  const [amount, setAmount] = useState('1.50');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [captureContext, setCaptureContext] = useState(null);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  
  const ucContainerRef = useRef(null);
  const ucInstanceRef = useRef(null);

  // Extract client library info from capture context JWT
  const getClientLibraryInfo = (captureContextJwt) => {
    try {
      const parts = captureContextJwt.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        const ctxData = payload.ctx && payload.ctx[0] && payload.ctx[0].data;
        return {
          url: ctxData && ctxData.clientLibrary
            ? ctxData.clientLibrary
            : 'https://testup.cybersource.com/uc/v1/assets/SecureAcceptance.js',
          integrity: ctxData && ctxData.clientLibraryIntegrity
            ? ctxData.clientLibraryIntegrity
            : null
        };
      }
    } catch (e) {
      console.warn('Error parsing capture context:', e);
    }
    return {
      url: 'https://testup.cybersource.com/uc/v1/assets/SecureAcceptance.js',
      integrity: null
    };
  };

  const initializeUnifiedCheckout = useCallback(async () => {
    if (!captureContext || !window.Accept) {
      console.error('Unified Checkout not available - Accept function:', typeof window.Accept);
      setError('Payment form not available. Accept function not found.');
      setLoading(false);
      return;
    }

    try {
      // Clear container
      if (ucContainerRef.current) {
        ucContainerRef.current.innerHTML = '';
      }

      console.log('Initializing Accept() with capture context...');
      
      // Initialize Unified Checkout using Accept() function
      const acceptInstance = await window.Accept(captureContext.captureContext);
      console.log('Accept() initialized:', acceptInstance);

      // Create unifiedPayments instance (embedded mode)
      console.log('Creating unifiedPayments()...');
      const unifiedPayments = await acceptInstance.unifiedPayments(false);
      console.log('unifiedPayments created:', unifiedPayments);

      ucInstanceRef.current = unifiedPayments;

      // Set up event handlers
      if (typeof unifiedPayments.on === 'function') {
        unifiedPayments.on('ready', () => {
          console.log('Unified Checkout ready');
          setCheckoutReady(true);
          setLoading(false);
        });

        unifiedPayments.on('paymentMethodSelected', (data) => {
          console.log('Payment method selected:', data);
        });

        unifiedPayments.on('token', (data) => {
          console.log('Transient token received:', data);
          const transientToken = data.transientToken || data.token || data;
          handlePayment(transientToken);
        });

        unifiedPayments.on('error', (error) => {
          console.error('Unified Checkout error:', error);
          setError(error.message || 'Payment form error');
          setLoading(false);
        });

        unifiedPayments.on('cancel', () => {
          console.log('Payment cancelled by user');
          setError('Payment cancelled');
          setLoading(false);
        });
      } else {
        console.warn('Event listeners not supported');
        setCheckoutReady(true);
        setLoading(false);
      }

      // Show the payment form
      const showConfig = {
        containers: {
          paymentSelection: ucContainerRef.current,
          paymentScreen: ucContainerRef.current
        }
      };

      console.log('Calling unifiedPayments.show()...');
      await unifiedPayments.show(showConfig);
      console.log('Payment form displayed');

    } catch (err) {
      console.error('Error initializing Unified Checkout:', err);
      setError(err.message || 'Failed to initialize payment form');
      setLoading(false);
    }
  }, [captureContext, handlePayment]);

  // Load Unified Checkout script
  useEffect(() => {
    if (!captureContext) return;

    const libInfo = getClientLibraryInfo(captureContext.captureContext);
    console.log('Loading Unified Checkout library:', libInfo.url);

    const script = document.createElement('script');
    script.src = libInfo.url;
    if (libInfo.integrity) {
      script.integrity = libInfo.integrity;
      script.crossOrigin = 'anonymous';
    }
    script.async = true;

    script.onload = () => {
      console.log('Unified Checkout script loaded');
      // Wait a bit for Accept to initialize
      setTimeout(() => {
        initializeUnifiedCheckout();
      }, 500);
    };

    script.onerror = (err) => {
      console.error('Failed to load Unified Checkout script:', err);
      setError('Failed to load payment form');
      setLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (ucInstanceRef.current) {
        try {
          // Try to destroy if method exists
          if (typeof ucInstanceRef.current.destroy === 'function') {
            ucInstanceRef.current.destroy();
          }
        } catch (e) {
          console.warn('Error destroying UC instance:', e);
        }
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [captureContext, initializeUnifiedCheckout]);

  const getCaptureContext = async () => {
    setLoading(true);
    setError(null);
    setPaymentResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/unified-checkout/capture-context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
          allowedPaymentTypes: ['PANENTRY'],
          amount: amount,
          currency: currency,
          country: 'KE',
          locale: 'en_KE',
          clientVersion: '0.31',
          targetOrigins: [window.location.origin],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Capture context received:', data);
      setCaptureContext(data);
    } catch (err) {
      console.error('Error getting capture context:', err);
      setError(err.message || 'Failed to initialize payment form');
      setLoading(false);
    }
  };


  const handlePayment = useCallback(async (transientToken) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/unified-checkout/charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transientToken: transientToken,
          amount: amount,
          currency: currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Payment failed: ${response.status}`);
      }

      console.log('Payment successful:', data);
      setPaymentResult(data);
      setLoading(false);

      // Reset form after 3 seconds
      setTimeout(() => {
        setPaymentResult(null);
        setCaptureContext(null);
        setCheckoutReady(false);
        if (ucInstanceRef.current) {
          try {
            if (typeof ucInstanceRef.current.destroy === 'function') {
              ucInstanceRef.current.destroy();
            }
          } catch (e) {
            console.warn('Error destroying UC instance:', e);
          }
        }
      }, 3000);
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed');
      setLoading(false);
    }
  }, [amount, currency]);

  return (
    <div className="App">
      <div className="checkout-container">
        <h1>Unified Checkout Test</h1>
        <p className="subtitle">Test CyberSource Unified Checkout with 3D Secure</p>

        {!captureContext && (
          <div className="form-section">
            <div className="form-group">
              <label>Amount (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={loading}
              >
                <option value="USD">USD</option>
                <option value="KES">KES</option>
              </select>
            </div>
            <button
              onClick={getCaptureContext}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Loading...' : 'Initialize Payment Form'}
            </button>
          </div>
        )}

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
            <button onClick={() => setError(null)} className="btn-close">×</button>
          </div>
        )}

        {paymentResult && (
          <div className="success-message">
            <h3>Payment Successful!</h3>
            <pre>{JSON.stringify(paymentResult, null, 2)}</pre>
          </div>
        )}

        {captureContext && (
          <div className="payment-section">
            <div className="payment-info">
              <p><strong>Amount:</strong> {amount} {currency}</p>
              <button
                onClick={() => {
                  setCaptureContext(null);
                  setCheckoutReady(false);
                  setPaymentResult(null);
                  if (ucInstanceRef.current) {
                    try {
                      if (typeof ucInstanceRef.current.destroy === 'function') {
                        ucInstanceRef.current.destroy();
                      }
                    } catch (e) {
                      console.warn('Error destroying UC instance:', e);
                    }
                  }
                  if (ucContainerRef.current) {
                    ucContainerRef.current.innerHTML = '';
                  }
                }}
                className="btn-secondary"
              >
                Reset
              </button>
            </div>
            <div
              ref={ucContainerRef}
              id="unified-checkout-container"
              className="uc-container"
            >
              {loading && !checkoutReady && (
                <div className="loading">Loading payment form...</div>
              )}
            </div>
          </div>
        )}

        <div className="info-section">
          <h3>Configuration</h3>
          <p><strong>Backend URL:</strong> {API_BASE_URL}</p>
          <p><strong>Current Origin:</strong> {window.location.origin}</p>
          <p><strong>Target Origins:</strong> [{window.location.origin}]</p>
        </div>
      </div>
    </div>
  );
}

export default App;

