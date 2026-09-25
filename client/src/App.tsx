import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Calendar, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  ExternalLink,
  RefreshCw,
  LogOut,
  User,
  FlaskConical
} from 'lucide-react';

interface DiagnosticCentre {
  id: string;
  name: string;
  location: string;
  city: string;
  contactPhone?: string;
  availableTestsCount: number;
}

interface CentreTestDetail {
  testId: string;
  name: string;
  category: string;
  description?: string;
  sampleRequired?: string;
  turnaroundTime?: string;
  price: number;
}

interface Booking {
  id: string;
  amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  appointmentDate: string;
  centre: { id: string; name: string; location?: string; city?: string };
  test: { id: string; name: string; category?: string; turnaroundTime?: string };
  payments?: Array<{ id: string; status: string; transactionId: string; amount: number }>;
}

export default function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem('eve_token') || '');
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('eve_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Auth form states
  const [email, setEmail] = useState('patient@evehealthcare.com');
  const [password, setPassword] = useState('Password123');
  const [fullName, setFullName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [authError, setAuthError] = useState('');

  // Data states
  const [centres, setCentres] = useState<DiagnosticCentre[]>([]);
  const [selectedCentreId, setSelectedCentreId] = useState<string>('');
  const [centreDetails, setCentreDetails] = useState<{ availableTests: CentreTestDetail[] } | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState<string>(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    d.setHours(9, 30, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Logs & notifications
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setActionLog((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 49)]);
  };

  // Fetch Centres
  useEffect(() => {
    fetch('/api/centres')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setCentres(data.data);
          if (data.data.length > 0 && !selectedCentreId) {
            setSelectedCentreId(data.data[0].id);
          }
        }
      })
      .catch((err) => addLog(`Error loading centres: ${err.message}`));
  }, []);

  // Fetch selected Centre tests
  useEffect(() => {
    if (!selectedCentreId) return;
    fetch(`/api/centres/${selectedCentreId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setCentreDetails(data.data);
          if (data.data.availableTests?.length > 0) {
            setSelectedTestId(data.data.availableTests[0].testId);
          }
        }
      })
      .catch((err) => addLog(`Error loading centre details: ${err.message}`));
  }, [selectedCentreId]);

  // Fetch Bookings
  const fetchBookings = () => {
    if (!token) return;
    fetch('/api/bookings', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setBookings(data.data);
        }
      })
      .catch((err) => addLog(`Failed to fetch bookings: ${err.message}`));
  };

  useEffect(() => {
    if (token) {
      fetchBookings();
    }
  }, [token]);

  // Auth Handler
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
    const payload = isSignup ? { fullName, email, password } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      setToken(data.data.token);
      setUser(data.data.user);
      localStorage.setItem('eve_token', data.data.token);
      localStorage.setItem('eve_user', JSON.stringify(data.data.user));
      addLog(`Authenticated as ${data.data.user.email}`);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('eve_token');
    localStorage.removeItem('eve_user');
    setBookings([]);
    addLog('Logged out');
  };

  // Create Booking
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert('Please log in first!');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          centreId: selectedCentreId,
          testId: selectedTestId,
          appointmentDate: new Date(appointmentDate).toISOString(),
          notes: bookingNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || (data.errors ? JSON.stringify(data.errors) : 'Booking failed'));
      }

      addLog(` Booking created! ID: ${data.data.id} - Status: PENDING`);
      fetchBookings();
    } catch (err: any) {
      addLog(` Booking error: ${err.message}`);
      alert(`Booking Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Simulate Payment
  const handleSimulatePayment = async (bookingId: string, outcome: 'SUCCESS' | 'FAILED') => {
    try {
      const res = await fetch('/payments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId,
          simulateOutcome: outcome,
          paymentMethod: 'UPI',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Payment simulation failed');
      }

      addLog(` Payment simulated: ${outcome}. Txn: ${data.data.transactionId} -> Booking: ${data.data.bookingStatus}`);
      fetchBookings();
    } catch (err: any) {
      addLog(` Payment error: ${err.message}`);
      alert(err.message);
    }
  };

  // Simulate Webhook Event (Idempotent test)
  const handleSimulateWebhook = async (booking: Booking, isDuplicate: boolean) => {
    // If testing duplicate, use a fixed event ID for this booking, else generate a fresh one
    const eventId = isDuplicate 
      ? `evt_fixed_${booking.id.slice(0, 8)}` 
      : `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      addLog(` Sending webhook event "${eventId}"...`);
      const res = await fetch('/payments/webhook/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          eventType: 'payment.succeeded',
          data: {
            bookingId: booking.id,
            status: 'SUCCESS',
            amount: booking.amount,
            transactionId: `TXN_WH_${Date.now()}`,
          },
        }),
      });

      const data = await res.json();
      if (data.data?.isDuplicate) {
        addLog(` [IDEMPOTENCY PROVED] Server returned 200 OK with: "${data.data.message}". Duplicate safely ignored!`);
        alert(`Idempotency Verified!\nStatus: ${data.data.status}\nMessage: ${data.data.message}\nNo duplicate charge created.`);
      } else {
        addLog(` Webhook processed: ${data.data.message}. Booking updated to CONFIRMED.`);
      }
      fetchBookings();
    } catch (err: any) {
      addLog(` Webhook error: ${err.message}`);
    }
  };

  // Cancel Booking
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Cancellation failed');
      }

      addLog(` Booking ${bookingId.slice(0, 8)} cancelled.`);
      fetchBookings();
    } catch (err: any) {
      addLog(` Cancel error: ${err.message}`);
      alert(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3.5 h-3.5" /> CONFIRMED</span>;
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><Clock className="w-3.5 h-3.5" /> PENDING</span>;
      case 'FAILED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800"><XCircle className="w-3.5 h-3.5" /> FAILED</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700"><AlertCircle className="w-3.5 h-3.5" /> CANCELLED</span>;
      default:
        return <span>{status}</span>;
    }
  };

  const selectedTestObj = centreDetails?.availableTests.find((t) => t.testId === selectedTestId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">EVE Healthcare</h1>
              <p className="text-xs text-slate-500 font-medium">Diagnostic Booking & Simulated Payment Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="http://localhost:5000/api-docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              OpenAPI / Swagger Docs
            </a>

            {user ? (
              <div className="flex items-center gap-3 bg-slate-100 py-1 px-3 rounded-full">
                <User className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-medium text-slate-800">{user.fullName || user.email}</span>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1 hover:text-rose-600 text-slate-500 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-medium">
                Not Authenticated
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Booking & Auth Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Authentication Card (if not logged in) */}
          {!user ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  {isSignup ? 'Patient Registration' : 'Patient Login'}
                </h2>
                <button
                  onClick={() => setIsSignup(!isSignup)}
                  className="text-xs text-teal-600 hover:underline font-medium"
                >
                  {isSignup ? 'Already have account? Login' : 'Need account? Sign up'}
                </button>
              </div>

              {authError && (
                <div className="p-3 mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                {isSignup && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : isSignup ? 'Sign Up' : 'Login'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('patient@evehealthcare.com');
                      setPassword('Password123');
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg font-medium transition"
                  >
                    Prefill Demo
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {/* Book Diagnostic Test Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-teal-600" />
              Book a Diagnostic Test
            </h2>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              {/* Select Centre */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  1. Select Diagnostic Centre
                </label>
                <select
                  value={selectedCentreId}
                  onChange={(e) => setSelectedCentreId(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {centres.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city}) — {c.availableTestsCount} tests
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Test */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  2. Select Diagnostic Test
                </label>
                <select
                  value={selectedTestId}
                  onChange={(e) => setSelectedTestId(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {centreDetails?.availableTests.map((t) => (
                    <option key={t.testId} value={t.testId}>
                      {t.name} — ₹{t.price} ({t.category})
                    </option>
                  ))}
                </select>

                {selectedTestObj && (
                  <div className="mt-2 p-2.5 bg-teal-50 border border-teal-100 rounded-lg text-xs space-y-1 text-slate-700">
                    <p className="font-semibold text-teal-900">{selectedTestObj.name}</p>
                    <p className="text-slate-600">{selectedTestObj.description}</p>
                    <div className="flex gap-4 pt-1 text-[11px] text-teal-800">
                      <span>🧪 {selectedTestObj.sampleRequired || 'Blood Sample'}</span>
                      <span>⏱️ {selectedTestObj.turnaroundTime || '24 hrs'}</span>
                      <span className="font-bold">💰 ₹{selectedTestObj.price}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Appointment Date */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  3. Appointment Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Doctor Notes / Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="e.g. Fasting 12 hours prior"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !user}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-teal-600/20 transition disabled:opacity-50"
              >
                {loading ? 'Booking...' : 'Confirm Appointment (Starts as PENDING)'}
              </button>
            </form>
          </div>

          {/* Activity Console */}
          <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 shadow-sm font-mono text-xs max-h-60 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-400">Live Backend Events Log</span>
              <button
                onClick={() => setActionLog([])}
                className="text-[10px] text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            </div>
            {actionLog.length === 0 ? (
              <p className="text-slate-600 italic">No events yet. Actions will stream here in real-time.</p>
            ) : (
              <div className="space-y-1">
                {actionLog.map((log, i) => (
                  <div key={i} className="text-slate-300 break-words leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Bookings & Payment Simulation (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  My Diagnostic Bookings
                </h2>
                <p className="text-xs text-slate-500">
                  Simulate direct payments and test idempotent webhook callbacks.
                </p>
              </div>
              <button
                onClick={fetchBookings}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>

            {bookings.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">No bookings found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Book a diagnostic test on the left to see state transitions in action.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-white transition shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{booking.test?.name}</h3>
                          {getStatusBadge(booking.status)}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {booking.centre?.name} ({booking.centre?.city})
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-slate-900">₹{booking.amount}</span>
                        <p className="text-[11px] text-slate-500">
                          {new Date(booking.appointmentDate).toLocaleDateString()} at{' '}
                          {new Date(booking.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {/* Booking ID and Payments */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                      <span>Booking ID: <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] text-slate-800">{booking.id}</code></span>
                      {booking.payments && booking.payments.length > 0 && (
                        <span>Txn: <code className="text-teal-700 font-mono">{booking.payments[0].transactionId}</code></span>
                      )}
                    </div>

                    {/* Interactive Action Controls */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                        Simulation & Idempotency Controls:
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {/* 1. Direct payment simulation */}
                        {booking.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleSimulatePayment(booking.id, 'SUCCESS')}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition shadow-sm"
                            >
                              Simulate Pay (Success)
                            </button>
                            <button
                              onClick={() => handleSimulatePayment(booking.id, 'FAILED')}
                              className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-md transition shadow-sm"
                            >
                              Simulate Pay (Fail)
                            </button>
                          </>
                        )}

                        {/* 2. Webhook simulation & duplicate webhook test */}
                        <button
                          onClick={() => handleSimulateWebhook(booking, false)}
                          className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition shadow-sm"
                        >
                          Send Webhook
                        </button>

                        <button
                          onClick={() => handleSimulateWebhook(booking, true)}
                          title="Sends the identical webhook payload with the same eventId twice"
                          className="px-2.5 py-1 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-md transition shadow-sm flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          Send Duplicate (Test Idempotency)
                        </button>

                        {/* 3. Cancellation */}
                        {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-md transition ml-auto"
                          >
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
