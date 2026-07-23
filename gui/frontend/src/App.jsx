import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Plus,
  QrCode,
  User,
  Settings,
  History,
  FileCode,
  Shield,
  Eye,
  EyeOff,
  Copy,
  Check,
  Send,
  Database,
  ArrowRight,
  RotateCcw,
  Trash2,
  Moon,
  Sun,
  Camera,
  Upload,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Building
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard'); // dashboard, send, history, cards, qr, profile, dev
  const [token, setToken] = useState(localStorage.getItem('simplepay_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('simplepay_user')) || null);
  const [authView, setAuthView] = useState('login'); // login, register
  
  // Auth Form State
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authOrg, setAuthOrg] = useState('');
  const [authAlert, setAuthAlert] = useState(null);
  
  // Global App States
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [cards, setCards] = useState([]);
  const [profile, setProfile] = useState({});
  const [logs, setLogs] = useState([]);
  const [dbStatus, setDbStatus] = useState('Connecting...');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutCooldown, setLockoutCooldown] = useState(0);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutCooldown > 0) {
      const timer = setTimeout(() => setLockoutCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [lockoutCooldown]);

  // Modals
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Theme Toggler
  const toggleTheme = () => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.remove('dark');
      setDarkMode(false);
    } else {
      root.classList.add('dark');
      setDarkMode(true);
    }
  };

  // Fetch initial dashboard stats & lists
  const refreshData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Fetch Stats
      const resStats = await fetch('/api/proxy/stats', { headers });
      if (resStats.ok) setStats(await resStats.json());

      // Fetch Payments
      const resPayments = await fetch('/api/proxy/payments', { headers });
      if (resPayments.ok) {
        const payData = await resPayments.json();
        setPayments(payData.data || []);
      }

      // Fetch Cards
      const resCards = await fetch('/api/proxy/cards', { headers });
      if (resCards.ok) {
        const cardData = await resCards.json();
        setCards(cardData.data || []);
      }

      // Fetch Profile
      const resProf = await fetch('/api/proxy/profile', { headers });
      if (resProf.ok) {
        const profData = await resProf.json();
        setProfile(profData.data || {});
      }

      // Fetch Logs
      const resLogs = await fetch('/api/proxy/activity-logs', { headers });
      if (resLogs.ok) setLogs(await resLogs.json());

      // Fetch Health
      const resHealth = await fetch('/api/proxy/health', { headers });
      if (resHealth.ok) {
        const health = await resHealth.json();
        setDbStatus(health.database === 'connected' ? 'Replica Set Online' : 'Offline');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) refreshData();
  }, [token]);

  // Auth Operations
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthAlert(null);

    if (authView === 'login' && lockoutCooldown > 0) {
      setAuthAlert({ type: 'error', msg: `Locked out. Please wait ${lockoutCooldown} seconds.` });
      return;
    }

    const endpoint = authView === 'login' ? '/api/proxy/auth/login' : '/api/proxy/auth/register';
    const payload = authView === 'login' 
      ? { email: authEmail, password: authPassword }
      : { full_name: authName, email: authEmail, organization: authOrg || 'Enterprise Corp', password: authPassword };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('simplepay_token', data.token);
        localStorage.setItem('simplepay_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setLoginAttempts(0);
        setLockoutCooldown(0);
      } else {
        let errorMsg = data.error || 'Authentication failed';
        
        if (authView === 'login') {
          const nextAttempts = loginAttempts + 1;
          setLoginAttempts(nextAttempts);
          if (nextAttempts >= 5) {
            setLockoutCooldown(30);
            errorMsg = "Too many failed attempts. You are locked out for 30 seconds.";
          } else {
            errorMsg = `${errorMsg} (Attempt ${nextAttempts}/5)`;
          }
        }
        
        setAuthAlert({ type: 'error', msg: errorMsg });
      }
    } catch (err) {
      setAuthAlert({ type: 'error', msg: `Connection error: ${err.message}` });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('simplepay_token');
    localStorage.removeItem('simplepay_user');
    setToken('');
    setUser(null);
  };

  if (!token) {
    return (
      <div className="min-height-screen min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8 relative overflow-hidden transition-colors duration-300">
        {/* Glow Effects */}
        <div className="absolute top-[-30%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-30%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px]" />

        <div className="w-full max-w-md bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-[32px] p-8 shadow-xl relative z-10">
          <div className="flex justify-center gap-3 items-center mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">SimplePay</span>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight text-center mb-2">
            {authView === 'login' ? 'Welcome Back' : 'Create Merchant Account'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
            {authView === 'login' ? 'Sign in to access your premium dashboard' : 'Join SimplePay and start accepting payments today'}
          </p>

          {authAlert && (
            <div className={`p-4 rounded-2xl text-xs font-semibold mb-6 border text-center ${
              authAlert.type === 'error' 
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
            }`}>
              {authAlert.msg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {authView === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                  <input
                    type="text"
                    className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 dark:text-white"
                    placeholder="John Doe"
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Organization</label>
                  <input
                    type="text"
                    className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 dark:text-white"
                    placeholder="Acme Inc"
                    value={authOrg}
                    onChange={e => setAuthOrg(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 dark:text-white"
                placeholder="admin@antipay.io"
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
                {authView === 'login' && (
                  <button
                    type="button"
                    onClick={() => alert("Please contact administrator at support@simplepay.io to reset your password.")}
                    className="text-xs font-bold text-indigo-500 dark:text-indigo-400 hover:underline hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showAuthPassword ? 'text' : 'password'}
                  className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-indigo-500 dark:text-white"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowAuthPassword(!showAuthPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authView === 'login' && lockoutCooldown > 0}
              className={`w-full py-3 bg-gradient-to-tr from-indigo-600 to-pink-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-glow-primary hover:scale-[1.01] active:scale-[0.99] transition-all text-sm mt-6 ${
                authView === 'login' && lockoutCooldown > 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {authView === 'login' 
                ? (lockoutCooldown > 0 ? `Locked Out (${lockoutCooldown}s)` : 'Sign In') 
                : 'Create Account'}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-slate-500 dark:text-slate-400">
            {authView === 'login' ? (
              <>Don't have an account? <button onClick={() => setAuthView('register')} className="text-blue-500 font-semibold hover:underline">Register</button></>
            ) : (
              <>Already have an account? <button onClick={() => setAuthView('login')} className="text-blue-500 font-semibold hover:underline">Sign In</button></>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 pb-20 md:pb-0 md:pl-64 relative overflow-hidden">
      {/* Background Glowing Auroras */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/5 dark:bg-indigo-600/10 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-600/5 dark:bg-pink-600/10 blur-[130px] pointer-events-none z-0" />

      {/* Sidebar Navigation - Laptop */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card/50 dark:bg-card/40 border-r border-border backdrop-blur-xl p-6 hidden md:flex flex-col justify-between z-50">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-glow-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">SimplePay</span>
          </div>

          <nav className="space-y-1.5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Wallet },
              { id: 'send', label: 'Send Money', icon: Send },
              { id: 'history', label: 'History', icon: History },
              { id: 'cards', label: 'Cards Wallet', icon: CreditCardIcon },
              { id: 'qr', label: 'QR Payments', icon: QrCode },
              { id: 'profile', label: 'Merchant Profile', icon: User },
              { id: 'dev', label: 'API Explorer', icon: FileCode }
            ].map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                    isActive 
                      ? 'bg-gradient-to-tr from-indigo-600 to-pink-600 text-white shadow-lg shadow-glow-primary' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-secondary/80 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-secondary/50 dark:bg-secondary/20 rounded-2xl border border-border">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Database status</div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-glow-success" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{dbStatus}</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-secondary dark:bg-secondary/35 border border-border hover:opacity-90 hover:scale-105 active:scale-95 transition-all"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>
            <button
              onClick={handleLogout}
              className="text-xs font-extrabold text-rose-500 hover:text-rose-600 hover:underline"
            >
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 border-t border-slate-200/50 dark:border-white/5 backdrop-blur-xl flex justify-around items-center py-3 md:hidden z-50">
        {[
          { id: 'dashboard', label: 'Wallet', icon: Wallet },
          { id: 'send', label: 'Send', icon: Send },
          { id: 'history', label: 'History', icon: History },
          { id: 'cards', label: 'Cards', icon: CreditCardIcon },
          { id: 'profile', label: 'Profile', icon: User }
        ].map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
                isActive ? 'text-blue-600' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-600/10' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Main Container */}
      <main className="p-4 md:p-8 max-w-5xl mx-auto">
        {/* Header toolbar */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Merchant Center
              {loading && <RefreshCw className="w-4.5 h-4.5 text-blue-500 animate-spin" />}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              Welcome back, <strong className="text-slate-700 dark:text-slate-200">{profile.full_name || user?.full_name}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-500 dark:text-slate-400 shadow-sm"
              title="Refresh Dashboard"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowChargeModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-tr from-indigo-600 to-pink-600 hover:opacity-95 text-white font-bold rounded-2xl shadow-lg shadow-glow-primary hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 text-xs md:text-sm"
            >
              <Plus className="w-4 h-4" />
              Process Charge
            </button>
          </div>
        </header>

        {/* Tab views layout with animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {currentTab === 'dashboard' && (
              <DashboardView
                stats={stats}
                payments={payments}
                setCurrentTab={setCurrentTab}
                setSelectedReceipt={setSelectedReceipt}
                triggerSeed={async () => {
                  setLoading(true);
                  await fetch('/api/proxy/seed', { method: 'POST' });
                  await refreshData();
                }}
              />
            )}
            
            {currentTab === 'send' && (
              <SendMoneyView
                profile={profile}
                onSuccess={() => {
                  setCurrentTab('dashboard');
                  refreshData();
                }}
              />
            )}

            {currentTab === 'history' && (
              <HistoryView
                payments={payments}
                setSelectedReceipt={setSelectedReceipt}
                refreshData={refreshData}
              />
            )}

            {currentTab === 'cards' && (
              <CardsView
                cards={cards}
                profile={profile}
                refreshData={refreshData}
              />
            )}

            {currentTab === 'qr' && (
              <QrView
                profile={profile}
                onScanSuccess={(payload) => {
                  // Prefill charge modal or execute payment
                  setCurrentTab('dashboard');
                  setShowChargeModal(true);
                  setTimeout(() => {
                    document.getElementById('charge_customer').value = payload.merchant_name || '';
                    document.getElementById('charge_amount').value = payload.amount || '0';
                    document.getElementById('charge_desc').value = `[QR Scan] ${payload.description || ''}`;
                  }, 100);
                }}
              />
            )}

            {currentTab === 'profile' && (
              <ProfileView
                profile={profile}
                refreshData={refreshData}
              />
            )}

            {currentTab === 'dev' && (
              <DevView />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modal: Process Payment */}
      <AnimatePresence>
        {showChargeModal && (
          <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-md flex items-center justify-center px-4 py-8 z-[100]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                <h3 className="font-extrabold text-base tracking-tight">Process Instant Charge</h3>
                <button onClick={() => setShowChargeModal(false)} className="text-slate-400 hover:text-slate-600 font-semibold text-lg">&times;</button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                const payload = {
                  customer_name: document.getElementById('charge_customer').value,
                  amount: parseFloat(document.getElementById('charge_amount').value),
                  currency: document.getElementById('charge_currency').value,
                  payment_method: document.getElementById('charge_method').value,
                  description: document.getElementById('charge_desc').value
                };
                try {
                  const res = await fetch('/api/proxy/payments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });
                  if (res.ok) {
                    alert('✅ Payment authorized and processed successfully!');
                    setShowChargeModal(false);
                    refreshData();
                  } else {
                    const data = await res.json();
                    alert(`❌ Charge failed: ${data.error}`);
                  }
                } catch(err) {
                  alert(err.message);
                } finally {
                  setLoading(false);
                }
              }}>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Customer / Business Name</label>
                    <input id="charge_customer" type="text" className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Acme Corp" required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Amount</label>
                      <input id="charge_amount" type="number" step="0.01" className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" defaultValue="0.00" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Currency</label>
                      <select id="charge_currency" className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500">
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="INR">INR (₹)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Payment Method</label>
                    <select id="charge_method" className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500">
                      <option value="Credit Card">Credit Card</option>
                      <option value="Apple Pay">Apple Pay</option>
                      <option value="Google Pay">Google Pay</option>
                      <option value="PayPal">PayPal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Description / Invoice Ref</label>
                    <input id="charge_desc" type="text" className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. SaaS Subscription" />
                  </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowChargeModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/10">Authorize Charge</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Receipt View */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-md flex items-center justify-center px-4 py-8 z-[100]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-2xl relative"
            >
              {/* Receipt Visual Top */}
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 px-6 py-8 text-center text-white relative">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div className="text-xs uppercase font-extrabold tracking-widest text-blue-200">Payment receipt</div>
                <div className="text-3xl font-extrabold mt-1">
                  {formatCurrency(selectedReceipt.amount, selectedReceipt.currency)}
                </div>
                <div className="text-xs font-medium text-blue-100 mt-2">
                  Reference ID: {selectedReceipt.transaction_id.slice(-8)}
                </div>
              </div>

              {/* Receipt details */}
              <div className="p-6 space-y-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold text-xs uppercase">Customer</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedReceipt.customer_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold text-xs uppercase">Method</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedReceipt.payment_method}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold text-xs uppercase">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    selectedReceipt.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' :
                    selectedReceipt.status === 'FAILED' ? 'bg-rose-500/10 text-rose-500' :
                    selectedReceipt.status === 'REFUNDED' ? 'bg-sky-500/10 text-sky-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>{selectedReceipt.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold text-xs uppercase">Date</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{new Date(selectedReceipt.created_at).toLocaleString()}</span>
                </div>

                <div className="p-3 bg-slate-100/50 dark:bg-slate-800/40 rounded-xl text-xs font-medium border border-slate-100 dark:border-white/5">
                  <div className="font-semibold text-slate-400 uppercase text-[9px] tracking-widest mb-1">Invoice Info</div>
                  {selectedReceipt.description || 'Standard platform charge'}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-white/5 flex gap-3 justify-center">
                {selectedReceipt.status !== 'REFUNDED' && (
                  <button
                    onClick={async () => {
                      if (!confirm('Issue refund?')) return;
                      try {
                        const res = await fetch(`/api/proxy/payments/${selectedReceipt.transaction_id}/refund`, { method: 'PUT' });
                        if (res.ok) {
                          alert('Refund issued');
                          setSelectedReceipt(null);
                          refreshData();
                        }
                      } catch(e){}
                    }}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs text-center border border-slate-200/50 dark:border-white/5"
                  >
                    Issue Refund
                  </button>
                )}
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs text-center shadow-lg shadow-blue-500/10"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Icons placeholders
function CreditCardIcon(props) {
  return <Wallet {...props} />;
}

// --- SUB-VIEWS ---

function DashboardView({ stats, payments, setCurrentTab, setSelectedReceipt, triggerSeed }) {
  return (
    <div className="space-y-8">
      {/* Balance Card Section */}
      <div className="bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 rounded-[32px] p-6 md:p-8 text-white shadow-xl shadow-glow-primary relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex justify-between items-center mb-6">
          <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-100">SimplePay Merchant Balance</div>
          <span className="px-2.5 py-1 bg-white/20 rounded-full text-[9px] font-bold tracking-wider uppercase">Live Mode</span>
        </div>

        <div className="text-3xl md:text-4xl font-extrabold mb-2 font-sans tracking-tight">
          {formatCurrency(stats?.total_volume || 0)}
        </div>
        <p className="text-xs text-indigo-100 font-medium">
          Authorizations rate: <strong className="text-white">{stats?.success_rate || 0}%</strong> across <strong className="text-white">{stats?.total_transactions || 0}</strong> transactions
        </p>

        {/* Quick Actions bar inside card */}
        <div className="grid grid-cols-4 gap-2 mt-8 pt-6 border-t border-white/10 text-center">
          <button onClick={() => setCurrentTab('send')} className="flex flex-col items-center gap-1.5 hover:opacity-90">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><Send className="w-4 h-4 text-white" /></div>
            <span className="text-[10px] font-bold text-white">Send</span>
          </button>
          <button onClick={() => setCurrentTab('qr')} className="flex flex-col items-center gap-1.5 hover:opacity-90">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><QrCode className="w-4 h-4 text-white" /></div>
            <span className="text-[10px] font-bold text-white">Scan</span>
          </button>
          <button onClick={() => setCurrentTab('cards')} className="flex flex-col items-center gap-1.5 hover:opacity-90">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><Wallet className="w-4 h-4 text-white" /></div>
            <span className="text-[10px] font-bold text-white">Cards</span>
          </button>
          <button onClick={triggerSeed} className="flex flex-col items-center gap-1.5 hover:opacity-90">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><Database className="w-4 h-4 text-white" /></div>
            <span className="text-[10px] font-bold text-white">Seed Data</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/70 dark:bg-slate-900/60 glass rounded-[24px] p-5 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total volume</div>
          <div className="text-xl font-extrabold">{formatCurrency(stats?.total_volume || 0)}</div>
        </div>
        <div className="bg-white/70 dark:bg-slate-900/60 glass rounded-[24px] p-5 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Success SLA</div>
          <div className="text-xl font-extrabold">{stats?.success_rate || 0}%</div>
        </div>
      </div>

      {/* Recent transactions widget feed */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-extrabold text-sm tracking-wider uppercase text-slate-400 dark:text-slate-500">Recent transactions</h3>
          <button onClick={() => setCurrentTab('history')} className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1">
            See all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {payments.slice(0, 4).map(item => (
            <div
              key={item.transaction_id}
              onClick={() => setSelectedReceipt(item)}
              className="flex justify-between items-center p-4 bg-white/70 dark:bg-slate-900/60 glass rounded-2xl hover:bg-white dark:hover:bg-slate-900 hover:scale-[1.01] transition-all cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  item.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' :
                  item.status === 'FAILED' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {item.status === 'SUCCESS' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-xs font-bold">{item.customer_name}</div>
                  <div className="text-[10px] text-slate-400 font-medium">{new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xs font-extrabold ${item.status === 'FAILED' ? 'text-rose-500 line-through' : 'text-slate-800 dark:text-white'}`}>
                  {formatCurrency(item.amount, item.currency)}
                </div>
                <div className="text-[9px] text-slate-400 font-bold uppercase">{item.payment_method}</div>
              </div>
            </div>
          ))}

          {payments.length === 0 && (
            <div className="text-center p-8 text-xs text-slate-400">
              No transactions seeded. Click "Seed Data" or "Process Charge" above to populate records.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SendMoneyView({ profile, onSuccess }) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('0.00');
  const [currency, setCurrency] = useState('USD');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Seed Contacts List
  const recentContacts = [
    { name: 'Prateek Bisht', email: 'prateek@simplepay.io', initials: 'PB', color: 'bg-emerald-500/10 text-emerald-500' },
    { name: 'Jane Doe', email: 'jane@company.com', initials: 'JD', color: 'bg-amber-500/10 text-amber-500' },
    { name: 'Enterprise Corp', email: 'billing@enterprise.com', initials: 'EC', color: 'bg-blue-500/10 text-blue-500' }
  ];

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        customer_name: recipient,
        amount: parseFloat(amount),
        currency: currency,
        payment_method: 'Wire Transfer',
        description: note || 'Direct Wallet Transfer'
      };

      const res = await fetch('/api/proxy/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert(`✅ Succeeded! Sent ${formatCurrency(payload.amount, payload.currency)} to ${payload.customer_name}`);
        onSuccess();
      } else {
        const d = await res.json();
        alert(`❌ Transfer failed: ${d.error}`);
      }
    } catch(err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/70 dark:bg-slate-900/60 glass rounded-[32px] p-6 md:p-8 shadow-xl">
      <h3 className="text-lg font-extrabold tracking-tight mb-6">Send Instant Transfer</h3>
      
      {/* Recent Contacts Grid */}
      <div className="mb-6">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Recent Recipients</label>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {recentContacts.map(contact => (
            <button
              key={contact.email}
              type="button"
              onClick={() => setRecipient(contact.name)}
              className="flex flex-col items-center gap-1.5 focus:outline-none shrink-0"
            >
              <div className={`w-12 h-12 rounded-2xl ${contact.color} flex items-center justify-center text-sm font-extrabold border border-slate-200/50 dark:border-white/5`}>
                {contact.initials}
              </div>
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{contact.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Recipient Name</label>
          <div className="relative">
            <input
              type="text"
              className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Enter name or account"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Dynamic Amount Input Widget */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-200/50 dark:border-white/5 text-center">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Enter Amount</label>
          <div className="flex justify-center items-center gap-2">
            <select
              className="bg-transparent text-xl font-extrabold text-blue-600 focus:outline-none cursor-pointer"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
            </select>
            <input
              type="number"
              step="0.01"
              className="bg-transparent text-3xl font-black text-slate-900 dark:text-white max-w-[160px] text-center focus:outline-none"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Note / Description</label>
          <input
            type="text"
            className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Direct invoice, rent, utilities..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-blue-500/20 hover:opacity-95 transition-all text-sm flex items-center justify-center gap-2 mt-6"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Authorize and Send Now
        </button>
      </form>
    </div>
  );
}

function HistoryView({ payments, setSelectedReceipt, refreshData }) {
  const [filter, setFilter] = useState('ALL'); // ALL, SUCCESS, FAILED, REFUNDED
  const [search, setSearch] = useState('');

  const filtered = payments.filter(p => {
    const matchesFilter = filter === 'ALL' || p.status === filter;
    const matchesSearch = p.customer_name.toLowerCase().includes(search.toLowerCase()) || p.transaction_id.includes(search);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            className="w-full bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-2xl pl-11 pr-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 shadow-sm"
            placeholder="Search customer, ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Dynamic Filters Pills Row */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'SUCCESS', 'FAILED', 'REFUNDED'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                filter === tab 
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow-sm' 
                  : 'bg-white dark:bg-slate-900 border-slate-200/50 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List Feed */}
      <div className="space-y-2.5">
        {filtered.map(item => (
          <div
            key={item.transaction_id}
            onClick={() => setSelectedReceipt(item)}
            className="flex justify-between items-center p-4 bg-white/70 dark:bg-slate-900/60 glass rounded-2xl hover:bg-white dark:hover:bg-slate-900 hover:scale-[1.01] transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                item.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' :
                item.status === 'FAILED' ? 'bg-rose-500/10 text-rose-500' : 'bg-sky-500/10 text-sky-500'
              }`}>
                {item.status === 'SUCCESS' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-bold">{item.customer_name}</div>
                <div className="text-[10px] text-slate-400 font-medium">{new Date(item.created_at).toLocaleString()}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className={`text-xs font-extrabold ${
                  item.status === 'SUCCESS' ? 'text-emerald-500' :
                  item.status === 'FAILED' ? 'text-rose-500 line-through' :
                  item.status === 'REFUNDED' ? 'text-sky-500' : 'text-slate-800 dark:text-white'
                }`}>
                  {item.status === 'SUCCESS' ? '+' : ''}
                  {formatCurrency(item.amount, item.currency)}
                </div>
                <div className="text-[9px] text-slate-400 font-bold uppercase">{item.payment_method}</div>
              </div>

              {/* Action list */}
              <div className="flex gap-1">
                {item.status !== 'REFUNDED' && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm('Refund this record?')) return;
                      await fetch(`/api/proxy/payments/${item.transaction_id}/refund`, { method: 'PUT' });
                      refreshData();
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition-all"
                    title="Refund Transaction"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm('Delete record permanently?')) return;
                    await fetch(`/api/proxy/payments/${item.transaction_id}`, { method: 'DELETE' });
                    refreshData();
                  }}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-500/10 transition-all"
                  title="Delete Record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center p-12 bg-white/50 dark:bg-slate-900/30 glass rounded-2xl text-xs text-slate-400">
            No payments found matching selected filter.
          </div>
        )}
      </div>
    </div>
  );
}

function CardsView({ cards, profile, refreshData }) {
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardHolder, setCardHolder] = useState(profile.full_name || 'Alexander Bisht');
  const [cardNum, setCardNum] = useState('');
  const [expMonth, setExpMonth] = useState('12');
  const [expYear, setExpYear] = useState('2028');
  const [cvv, setCvv] = useState('');

  const [liveNum, setLiveNum] = useState('•••• •••• •••• 4242');
  const [liveBrand, setLiveBrand] = useState('VISA');

  const onCardNumChange = (val) => {
    setCardNum(val);
    if (val.length >= 4) {
      setLiveNum(`•••• •••• •••• ${val.replace(/\s+/g, '').slice(-4)}`);
    } else {
      setLiveNum('•••• •••• •••• 4242');
    }
    let brand = 'VISA';
    if (val.startsWith('5')) brand = 'MASTERCARD';
    else if (val.startsWith('3')) brand = 'AMEX';
    setLiveBrand(brand);
  };

  const handleSaveCard = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/proxy/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardholder_name: cardHolder,
          card_number: cardNum,
          exp_month: expMonth,
          exp_year: expYear
        })
      });
      if (res.ok) {
        alert('✅ Credit card registered successfully!');
        setShowAddCard(false);
        setCardNum('');
        refreshData();
      }
    } catch(err){}
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="font-extrabold text-sm tracking-wider uppercase text-slate-400 dark:text-slate-500">Stored Funding Cards</h3>
        <button
          onClick={() => setShowAddCard(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 text-blue-500 font-bold rounded-lg text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Add Stored Card
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Interactive Visual Wallet widget */}
        <div className="bg-white/70 dark:bg-slate-900/60 glass rounded-[32px] p-6 shadow-sm flex flex-col items-center">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Live Preview Widget</div>
          
          <div className="w-full aspect-[1.58/1] rounded-[24px] p-6 text-white bg-gradient-to-tr from-blue-600 to-indigo-700 relative overflow-hidden shadow-xl border border-white/20">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(255,255,255,0.1)_0%,transparent_60%)] pointer-events-none" />
            <div className="flex justify-between items-center mb-6">
              {/* Gold Chip simulation */}
              <div className="w-10 h-8 rounded-lg bg-gradient-to-tr from-yellow-100 to-amber-200 border border-white/40 relative">
                <div className="absolute inset-y-0 left-1/3 right-1/3 border-x border-slate-900/10" />
                <div className="absolute inset-x-0 top-1/3 bottom-1/3 border-y border-slate-900/10" />
              </div>
              <span className="text-sm font-extrabold italic tracking-tight">{liveBrand}</span>
            </div>

            <div className="text-lg md:text-xl font-mono tracking-widest mb-6 text-center">{liveNum}</div>
            
            <div className="flex justify-between items-end">
              <div>
                <span className="text-[8px] uppercase tracking-wider text-blue-200 block">Card Holder</span>
                <span className="text-xs uppercase font-extrabold">{cardHolder}</span>
              </div>
              <div>
                <span className="text-[8px] uppercase tracking-wider text-blue-200 block">Expires</span>
                <span className="text-xs font-bold">{expMonth}/{expYear.slice(-2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stored cards list */}
        <div className="space-y-4">
          {cards.map(c => (
            <div
              key={c.card_id}
              className="p-5 bg-white/70 dark:bg-slate-900/60 glass rounded-[24px] border border-slate-200/50 dark:border-white/5 relative overflow-hidden shadow-sm"
            >
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-black italic">{c.brand}</span>
                <div className="flex gap-2">
                  {c.is_default ? (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-extrabold rounded-full">DEFAULT</span>
                  ) : (
                    <button
                      onClick={async () => {
                        await fetch(`/api/proxy/cards/${c.card_id}/default`, { method: 'PUT' });
                        refreshData();
                      }}
                      className="text-[9px] font-extrabold text-blue-500 hover:underline"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (!confirm('Remove card?')) return;
                      await fetch(`/api/proxy/cards/${c.card_id}`, { method: 'DELETE' });
                      refreshData();
                    }}
                    className="text-rose-500 p-0.5 hover:bg-rose-500/10 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-sm font-mono tracking-widest mb-4">•••• •••• •••• {c.last4}</div>
              
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-500">{c.cardholder_name.toUpperCase()}</span>
                <span className="font-semibold text-slate-400">{c.exp_month}/{c.exp_year.slice(-2)}</span>
              </div>
            </div>
          ))}

          {cards.length === 0 && (
            <div className="text-center p-12 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl text-xs text-slate-400 bg-white/40 dark:bg-slate-900/10">
              No credit cards registered. Click "Add Stored Card" to save a card.
            </div>
          )}
        </div>
      </div>

      {/* Modal Add Stored Card */}
      <AnimatePresence>
        {showAddCard && (
          <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-md flex items-center justify-center px-4 py-8 z-[100]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                <h3 className="font-extrabold text-base tracking-tight">Add Stored Credit Card</h3>
                <button onClick={() => setShowAddCard(false)} className="text-slate-400 font-semibold hover:text-slate-600 text-lg">&times;</button>
              </div>

              <form onSubmit={handleSaveCard}>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Cardholder Name</label>
                    <input
                      type="text"
                      className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                      placeholder="e.g. ALEXANDER BISHT"
                      value={cardHolder}
                      onChange={e => setCardHolder(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Card Number</label>
                    <input
                      type="text"
                      className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                      placeholder="4532 8910 4242 4242"
                      value={cardNum}
                      onChange={e => onCardNumChange(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Month</label>
                      <select
                        className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                        value={expMonth}
                        onChange={e => setExpMonth(e.target.value)}
                      >
                        <option value="01">01</option><option value="02">02</option>
                        <option value="03">03</option><option value="04">04</option>
                        <option value="05">05</option><option value="06">06</option>
                        <option value="07">07</option><option value="08">08</option>
                        <option value="09">09</option><option value="10">10</option>
                        <option value="11">11</option><option value="12">12</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Year</label>
                      <select
                        className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                        value={expYear}
                        onChange={e => setExpYear(e.target.value)}
                      >
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                        <option value="2028">2028</option>
                        <option value="2029">2029</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">CVV</label>
                      <input
                        type="password"
                        className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="•••"
                        value={cvv}
                        onChange={e => setCvv(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowAddCard(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/10">Register Card</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QrView({ profile, onScanSuccess }) {
  const [amount, setAmount] = useState('0.00');
  const [currency, setCurrency] = useState('USD');
  const [desc, setDesc] = useState('Merchant Subscription Ref');
  const [activeScannerTab, setActiveScannerTab] = useState('camera'); // camera, upload
  
  const merchantName = profile.full_name || 'Alexander Bisht';
  const merchantEmail = profile.email || 'admin@antipay.io';

  const payload = {
    app: "SimplePay",
    type: "PAYMENT_REQUEST",
    user_id: profile.user_id || 'USR-90218',
    merchant_name: merchantName,
    email: merchantEmail,
    amount: parseFloat(amount) || 0.00,
    currency: currency,
    description: desc,
    created_at: new Date().toISOString()
  };

  const encodedPayload = encodeURIComponent(JSON.stringify(payload));
  const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodedPayload}&color=000000&bgcolor=ffffff`;

  const copyLink = () => {
    const link = `https://simplepay.io/pay?user_id=${payload.user_id}&to=${encodeURIComponent(merchantName)}&amount=${amount}&currency=${currency}`;
    navigator.clipboard.writeText(link);
    alert('Unique paylink copied!');
  };

  // Run file decoder
  const handleUploadScan = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Simulate reader or invoke scanning lib
    if (window.Html5Qrcode) {
      const html5QrCode = new Html5Qrcode("scanner-viewport");
      html5QrCode.scanFile(file, true)
        .then(decodedText => {
          let parsed = JSON.parse(decodedText);
          alert('Scanned QR data successfully');
          onScanSuccess(parsed);
        })
        .catch(err => {
          alert('Decode error. Make sure it is a valid SimplePay request QR.');
        });
    } else {
      // Mock validation in sandbox context if HTML5Qrcode scanner library load fails
      setTimeout(() => {
        onScanSuccess({ merchant_name: 'Seed Merchant', amount: 250.00, currency: 'USD', description: 'Sample QR Import' });
      }, 500);
    }
  };

  // Launch camera
  useEffect(() => {
    let scanner = null;
    if (activeScannerTab === 'camera' && window.Html5QrcodeScanner) {
      try {
        scanner = new Html5QrcodeScanner("scanner-viewport", { fps: 10, qrbox: 200 }, false);
        scanner.render((decodedText) => {
          let parsedData;
          try {
            parsedData = JSON.parse(decodedText);
          } catch (e) {
            parsedData = {
              app: "SimplePay",
              type: "PAYMENT_REQUEST",
              merchant_name: "Scanned QR",
              amount: 0.00,
              currency: "USD",
              description: decodedText
            };
          }
          // Do not call scanner.clear() inside callback to avoid unmount clear conflicts.
          onScanSuccess(parsedData);
        }, () => {});
      } catch(e){
        console.error("Scanner initialization error:", e);
      }
    }
    return () => {
      if (scanner) {
        scanner.clear().catch(err => console.warn("Failed to clear scanner on unmount:", err));
      }
    };
  }, [activeScannerTab]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      {/* QR Generator */}
      <div className="bg-white/70 dark:bg-slate-900/60 glass rounded-[32px] p-6 shadow-sm text-center">
        <h3 className="text-base font-extrabold tracking-tight mb-6 flex justify-center gap-2"><QrCode className="w-5 h-5 text-blue-500" /> Receiver QR Generator</h3>
        
        <div className="bg-white p-5 rounded-[24px] inline-block border border-slate-200/50 shadow-md mb-6">
          <img src={qrImgSrc} alt="Invoice QR" className="w-[180px] h-[180px] mx-auto rounded-lg" />
        </div>

        <div className="text-2xl font-black text-slate-800 dark:text-white mb-1">
          {formatCurrency(payload.amount, currency)}
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-6">Pay to: {merchantName}</p>

        <div className="space-y-4 text-left border-t border-slate-100 dark:border-white/5 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Amount</label>
              <input type="number" step="0.01" className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500" value={amount} onChange={e=>setAmount(e.target.value)} />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Currency</label>
              <select className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500" value={currency} onChange={e=>setCurrency(e.target.value)}>
                <option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Reference Note</label>
            <input type="text" className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500" value={desc} onChange={e=>setDesc(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 justify-center mt-6">
          <a href={qrImgSrc} download={`simplepay-qr-${payload.user_id}.png`} className="flex-1 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg hover:opacity-95 text-center">Download Image</a>
          <button onClick={copyLink} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200/50 dark:border-white/5">Copy Link</button>
        </div>
      </div>

      {/* QR Scanner */}
      <div className="bg-white/70 dark:bg-slate-900/60 glass rounded-[32px] p-6 shadow-sm">
        <h3 className="text-base font-extrabold tracking-tight mb-6 flex gap-2"><Camera className="w-5 h-5 text-blue-500" /> Scanner Terminal</h3>
        
        <div className="flex gap-2 p-1 bg-slate-100/50 dark:bg-slate-800/40 rounded-xl mb-6">
          <button onClick={()=>setActiveScannerTab('camera')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeScannerTab === 'camera' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>Camera</button>
          <button onClick={()=>setActiveScannerTab('upload')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeScannerTab === 'upload' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>Upload File</button>
        </div>

        <div className="aspect-video w-full rounded-2xl bg-slate-950 flex flex-col items-center justify-center border border-slate-200/20 relative overflow-hidden">
          {activeScannerTab === 'camera' ? (
            <div id="scanner-viewport" className="w-full h-full" />
          ) : (
            <div id="scanner-viewport" className="text-center p-6 space-y-4">
              <Upload className="w-8 h-8 text-blue-500 mx-auto" />
              <div className="text-xs font-bold text-slate-400">Upload and scan invoice image</div>
              <input type="file" accept="image/*" className="hidden" id="file-qr" onChange={handleUploadScan} />
              <button onClick={()=>document.getElementById('file-qr').click()} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md">Select Image File</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileView({ profile, refreshData }) {
  const [name, setName] = useState(profile.full_name || '');
  const [email, setEmail] = useState(profile.email || '');
  const [org, setOrg] = useState(profile.organization || '');
  const [webhook, setWebhook] = useState(profile.webhook_url || '');
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const keyVal = profile.api_key || 'sk_live_9f82a10b4c739e1204d';

  const copyKey = () => {
    navigator.clipboard.writeText(keyVal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/proxy/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: name,
          email: email,
          organization: org,
          webhook_url: webhook
        })
      });
      if (res.ok) {
        alert('✅ Profile details updated!');
        refreshData();
      }
    } catch(err){}
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      {/* Profile Form */}
      <div className="bg-white/70 dark:bg-slate-900/60 glass rounded-[32px] p-6 shadow-sm">
        <h3 className="text-base font-extrabold tracking-tight mb-6">Profile Settings</h3>
        
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Merchant Name</label>
              <input type="text" className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500" value={name} onChange={e=>setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email Handle</label>
              <input type="email" className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500" value={email} onChange={e=>setEmail(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Company / Organization</label>
            <input type="text" className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500" value={org} onChange={e=>setOrg(e.target.value)} required />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Webhook Listener Target</label>
            <input type="url" className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500" value={webhook} onChange={e=>setWebhook(e.target.value)} />
          </div>

          <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg mt-6">Save Changes</button>
        </form>
      </div>

      {/* Security Credentials */}
      <div className="space-y-6">
        <div className="bg-white/70 dark:bg-slate-900/60 glass rounded-[32px] p-6 shadow-sm">
          <h3 className="text-base font-extrabold tracking-tight mb-2">Live API credentials</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Incorporate this secret key to route integrations safely.</p>

          <div className="flex gap-2 mb-4">
            <input
              type={showKey ? 'text' : 'password'}
              className="flex-1 bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none"
              value={keyVal}
              readonly
            />
            <button onClick={()=>setShowKey(!showKey)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button onClick={copyKey} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Security toggles */}
        <div className="bg-white/70 dark:bg-slate-900/60 glass rounded-[32px] p-6 shadow-sm">
          <h3 className="text-base font-extrabold tracking-tight mb-6">Security configuration</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
              <div>
                <div className="text-xs font-bold">Require 2FA tokens</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Dual-factor prompt for card transfers</p>
              </div>
              <input type="checkbox" className="w-4.5 h-4.5 rounded accent-blue-600 cursor-pointer" defaultChecked />
            </div>

            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
              <div>
                <div className="text-xs font-bold">Email alerts</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Receive immediate receipt statements</p>
              </div>
              <input type="checkbox" className="w-4.5 h-4.5 rounded accent-blue-600 cursor-pointer" defaultChecked />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DevView() {
  const [curlOutput, setCurlOutput] = useState('curl -X GET http://payment-service:5000/health');
  const [jsonOutput, setJsonOutput] = useState('Click an endpoint trigger to view response...');

  const triggerCall = async (endpoint, method) => {
    setCurlOutput(`curl -X ${method} http://payment-service:5000${endpoint}`);
    setJsonOutput('Triggering REST API connection...');
    try {
      const proxyPath = `/api/proxy${endpoint.replace('/api', '')}`;
      const res = await fetch(proxyPath, { method });
      const data = await res.json();
      setJsonOutput(JSON.stringify(data, null, 2));
    } catch(err) {
      setJsonOutput(JSON.stringify({ error: err.message }, null, 2));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <div className="bg-white/70 dark:bg-slate-900/60 glass rounded-[32px] p-6 shadow-sm">
        <h3 className="text-base font-extrabold tracking-tight mb-6">Dev REST Endpoints</h3>
        <div className="space-y-2">
          {[
            { path: '/health', method: 'GET' },
            { path: '/api/stats', method: 'GET' },
            { path: '/api/payments', method: 'GET' },
            { path: '/api/activity-logs', method: 'GET' },
            { path: '/api/seed', method: 'POST' }
          ].map(e => (
            <button
              key={e.path}
              onClick={() => triggerCall(e.path, e.method)}
              className="w-full flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 rounded-xl border border-slate-200/50 dark:border-white/5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all"
            >
              <code className="font-mono">{e.path}</code>
              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${e.method === 'GET' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{e.method}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-950 text-emerald-400 font-mono p-6 rounded-[32px] border border-white/5 shadow-xl space-y-4">
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold font-sans">cURL Equivalent</div>
          <pre className="text-xs bg-slate-900/50 p-3 rounded-xl border border-white/5 overflow-x-auto text-amber-400">{curlOutput}</pre>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold font-sans">JSON Response Body</div>
          <pre className="text-xs bg-slate-900/50 p-4 rounded-xl border border-white/5 overflow-x-auto min-h-[180px] max-h-[300px] text-sky-400">{jsonOutput}</pre>
        </div>
      </div>
    </div>
  );
}

// Utility: format currency
function formatCurrency(amount, currency = 'USD') {
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'INR' ? '₹' : '$';
  return `${sym}${parseFloat(amount || 0).toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
