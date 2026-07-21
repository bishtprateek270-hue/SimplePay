// SimplePay Gateway Enterprise App JS

document.addEventListener('DOMContentLoaded', () => {
    // 🔒 Auth Guard: Redirect unauthenticated users to /login
    checkAuthGuard();

    // Sync user profile & avatar initials globally
    syncUserProfileHeader();

    // Initial page data load if functions exist
    if (typeof loadDashboardData === 'function') loadDashboardData();
    if (typeof loadPaymentsLedger === 'function') loadPaymentsLedger();
    if (typeof loadAnalyticsData === 'function') loadAnalyticsData();
    if (typeof loadInspectorData === 'function') loadInspectorData();
});

// 🔒 Authentication Guard: Enforce Sign In Before Feature Access
function checkAuthGuard() {
    const currentPath = window.location.pathname;
    const publicPages = ['/login', '/register'];
    const token = localStorage.getItem('simplepay_token');

    // If on a public page (login/register) and already logged in, redirect to profile
    if (publicPages.includes(currentPath) && token) {
        window.location.href = '/profile';
        return;
    }

    // If on a protected page and NOT logged in, redirect to /login
    if (!publicPages.includes(currentPath) && !token) {
        window.location.href = '/login';
        return;
    }
}

// Log Out Handler
function handleLogout() {
    if (confirm("Are you sure you want to log out of your SimplePay Merchant Account?")) {
        localStorage.removeItem('simplepay_token');
        localStorage.removeItem('simplepay_user');
        window.location.href = '/login';
    }
}

// Calculate Initials from Full Name
function getInitials(name) {
    if (!name || typeof name !== 'string') return "AB";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Global Sync for Avatar Initials & Active User Profile
async function syncUserProfileHeader() {
    const storedUserStr = localStorage.getItem('simplepay_user');
    let prof = {};
    if (storedUserStr) {
        try { prof = JSON.parse(storedUserStr); } catch(e){}
    }

    try {
        const token = localStorage.getItem('simplepay_token');
        if (token) {
            const res = await fetch('/api/proxy/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.user) prof = data.user;
            }
        }

        if (prof.full_name) {
            const initials = getInitials(prof.full_name);
            
            // Update topbar avatar
            const avatarEl = document.getElementById('topbarAvatarInitials');
            if (avatarEl) avatarEl.innerText = initials;

            // Update user name pill in topbar
            const userNameEl = document.getElementById('topbarUserNameText');
            if (userNameEl) userNameEl.innerText = prof.full_name;
            
            // Update modal default customer name if empty
            const modalCustomerInput = document.getElementById('customer_name');
            if (modalCustomerInput && !modalCustomerInput.value) {
                modalCustomerInput.value = prof.full_name;
            }
        }
    } catch (e) {
        console.warn("Profile sync error:", e);
    }
}

// Modal Dialog Controls
function openNewPaymentModal() {
    document.getElementById('newPaymentModal').classList.add('active');
}

function closeNewPaymentModal() {
    document.getElementById('newPaymentModal').classList.remove('active');
}

// Payment Form Handler
async function handlePaymentSubmit(event) {
    event.preventDefault();
    const btn = document.getElementById('btnSubmitPayment');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';

    const payload = {
        customer_name: document.getElementById('customer_name').value.trim(),
        amount: parseFloat(document.getElementById('amount').value),
        currency: document.getElementById('currency').value,
        payment_method: document.getElementById('payment_method').value,
        description: document.getElementById('description').value.trim() || "Payment transaction"
    };

    try {
        const response = await fetch('/api/proxy/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`✅ Payment Authorized Successfully!\nTxn ID: ${result.data.transaction_id}`);
            closeNewPaymentModal();
            document.getElementById('newPaymentForm').reset();
            
            // Reload page view
            if (typeof loadDashboardData === 'function') loadDashboardData();
            if (typeof loadPaymentsLedger === 'function') loadPaymentsLedger();
        } else {
            alert(`❌ Payment Failed: ${result.error || 'Server error'}`);
        }
    } catch (error) {
        alert(`❌ Network Error: Could not connect to API (${error.message})`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-lock"></i> Authorize & Charge';
    }
}

// Seed Demo Data
async function triggerSeedData() {
    try {
        const res = await fetch('/api/proxy/seed', { method: 'POST' });
        const data = await res.json();
        alert(data.message || "Seeding complete!");
        location.reload();
    } catch (err) {
        alert(`Seeding failed: ${err.message}`);
    }
}

// Global Search Handler
function handleGlobalSearch(event) {
    if (event.key === 'Enter') {
        const query = event.target.value.trim();
        window.location.href = `/payments?q=${encodeURIComponent(query)}`;
    }
}

// Helper: Format Status Pill HTML
function getStatusPillHTML(status) {
    const s = (status || 'SUCCESS').toUpperCase();
    let badgeClass = 'status-succeeded';
    let icon = 'fa-check';

    if (s === 'FAILED') { badgeClass = 'status-failed'; icon = 'fa-xmark'; }
    else if (s === 'PENDING') { badgeClass = 'status-pending'; icon = 'fa-clock'; }
    else if (s === 'REFUNDED') { badgeClass = 'status-refunded'; icon = 'fa-rotate-left'; }

    return `<span class="status-pill ${badgeClass}"><i class="fa-solid ${icon}"></i> ${s}</span>`;
}

// Helper: Format Currency
function formatCurrency(amount, currency = 'USD') {
    const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'INR' ? '₹' : '$';
    return `${symbol}${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
