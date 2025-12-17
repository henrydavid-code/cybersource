// Backend API URL - Update this to your Render.com backend URL
const API_BASE_URL = 'https://97860815382d.ngrok-free.app';

// State
let captureContext = null;
let ucInstance = null;
let clientLibraryLoaded = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Display configuration info
    document.getElementById('backendUrl').textContent = API_BASE_URL;
    document.getElementById('currentOrigin').textContent = window.location.origin;
    document.getElementById('targetOrigins').textContent = `[${window.location.origin}]`;
});

// Extract client library info from capture context JWT
function getClientLibraryInfo(captureContextJwt) {
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
}

// Get capture context from backend
async function initializePayment() {
    const amount = document.getElementById('amountInput').value;
    const currency = document.getElementById('currencySelect').value;
    
    // Hide previous states
    hideAllSections();
    showLoading(true);
    
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
        captureContext = data;
        
        // Load Unified Checkout library
        await loadUnifiedCheckoutLibrary(data.captureContext);
        
    } catch (err) {
        console.error('Error getting capture context:', err);
        showError(err.message || 'Failed to initialize payment form');
        showLoading(false);
    }
}

// Load Unified Checkout JavaScript library
async function loadUnifiedCheckoutLibrary(captureContextJwt) {
    if (clientLibraryLoaded && window.Accept) {
        initializeUnifiedCheckout();
        return;
    }

    const libInfo = getClientLibraryInfo(captureContextJwt);
    console.log('Loading Unified Checkout library:', libInfo.url);

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = libInfo.url;
        if (libInfo.integrity) {
            script.integrity = libInfo.integrity;
            script.crossOrigin = 'anonymous';
        }
        script.async = true;

        script.onload = () => {
            console.log('Unified Checkout script loaded');
            clientLibraryLoaded = true;
            // Wait a bit for Accept to initialize
            setTimeout(() => {
                initializeUnifiedCheckout();
                resolve();
            }, 500);
        };

        script.onerror = (err) => {
            console.error('Failed to load Unified Checkout script:', err);
            showError('Failed to load payment form');
            showLoading(false);
            reject(err);
        };

        document.head.appendChild(script);
    });
}

// Initialize Unified Checkout
async function initializeUnifiedCheckout() {
    if (!captureContext || !window.Accept) {
        console.error('Unified Checkout not available - Accept function:', typeof window.Accept);
        showError('Payment form not available. Accept function not found.');
        showLoading(false);
        return;
    }

    try {
        const container = document.getElementById('unifiedCheckoutContainer');
        container.innerHTML = '';

        console.log('Initializing Accept() with capture context...');
        
        // Initialize Unified Checkout using Accept() function
        const acceptInstance = await window.Accept(captureContext.captureContext);
        console.log('Accept() initialized:', acceptInstance);

        // Create unifiedPayments instance (embedded mode)
        console.log('Creating unifiedPayments()...');
        const unifiedPayments = await acceptInstance.unifiedPayments(false);
        console.log('unifiedPayments created:', unifiedPayments);

        ucInstance = unifiedPayments;

        // Set up event handlers
        if (typeof unifiedPayments.on === 'function') {
            unifiedPayments.on('ready', () => {
                console.log('Unified Checkout ready');
                showLoading(false);
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
                showError(error.message || 'Payment form error');
                showLoading(false);
            });

            unifiedPayments.on('cancel', () => {
                console.log('Payment cancelled by user');
                showError('Payment cancelled');
                showLoading(false);
            });
        } else {
            console.warn('Event listeners not supported');
            showLoading(false);
        }

        // Show the payment form
        const showConfig = {
            containers: {
                paymentSelection: container,
                paymentScreen: container
            }
        };

        console.log('Calling unifiedPayments.show()...');
        await unifiedPayments.show(showConfig);
        console.log('Payment form displayed');

        // Show payment section
        document.getElementById('paymentInfo').classList.remove('hidden');
        document.getElementById('paymentAmount').textContent = 
            `${document.getElementById('amountInput').value} ${document.getElementById('currencySelect').value}`;
        document.getElementById('paymentContainer').classList.remove('hidden');
        document.getElementById('configSection').classList.add('hidden');

    } catch (err) {
        console.error('Error initializing Unified Checkout:', err);
        showError(err.message || 'Failed to initialize payment form');
        showLoading(false);
    }
}

// Handle payment with transient token
async function handlePayment(transientToken) {
    showLoading(true);
    hideError();

    try {
        const amount = document.getElementById('amountInput').value;
        const currency = document.getElementById('currencySelect').value;

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
        showSuccess(data);
        showLoading(false);

        // Reset form after 5 seconds
        setTimeout(() => {
            resetForm();
        }, 5000);
    } catch (err) {
        console.error('Payment error:', err);
        showError(err.message || 'Payment failed');
        showLoading(false);
    }
}

// UI Helper Functions
function showLoading(show) {
    const indicator = document.getElementById('loadingIndicator');
    if (show) {
        indicator.classList.remove('hidden');
    } else {
        indicator.classList.add('hidden');
    }
}

function showError(message) {
    document.getElementById('errorText').textContent = message;
    document.getElementById('errorMessage').classList.remove('hidden');
}

function hideError() {
    document.getElementById('errorMessage').classList.add('hidden');
}

function closeError() {
    hideError();
}

function showSuccess(data) {
    document.getElementById('successData').textContent = JSON.stringify(data, null, 2);
    document.getElementById('successMessage').classList.remove('hidden');
}

function hideAllSections() {
    document.getElementById('configSection').classList.remove('hidden');
    document.getElementById('paymentContainer').classList.add('hidden');
    document.getElementById('paymentInfo').classList.add('hidden');
    document.getElementById('errorMessage').classList.add('hidden');
    document.getElementById('successMessage').classList.add('hidden');
    hideError();
}

function resetForm() {
    captureContext = null;
    ucInstance = null;
    clientLibraryLoaded = false;
    
    if (document.getElementById('unifiedCheckoutContainer')) {
        document.getElementById('unifiedCheckoutContainer').innerHTML = '';
    }
    
    hideAllSections();
    showLoading(false);
}


