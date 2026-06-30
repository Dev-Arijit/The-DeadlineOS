import React, { useState } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from '../lib/firebase';
import { ShieldCheck, Mail, Lock, User, RefreshCw, Sparkles, ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthPageProps {
  onBackToLanding: () => void;
  onCustomLogin: (email: string, callsign: string) => void;
}

export function AuthPage({ onBackToLanding, onCustomLogin }: AuthPageProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [callsign, setCallsign] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Custom session fallback
  const [showBypass, setShowBypass] = useState(false);
  const [bypassEmail, setBypassEmail] = useState('');
  const [bypassName, setBypassName] = useState('');

  const resetMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    resetMessages();
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Third-party sign-in failed. Please click "Pilot ID Bypass" if popups are blocked inside the preview.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    resetMessages();

    try {
      if (mode === 'signin') {
        if (!password) {
          setErrorMsg('Password is required.');
          setLoading(false);
          return;
        }
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else if (mode === 'signup') {
        if (!password || password.length < 6) {
          setErrorMsg('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        setSuccessMsg('Account created successfully! Enjoy full-stack agent capabilities.');
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email.trim());
        setSuccessMsg('Security code reset email dispatched to pilot inbox!');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setErrorMsg('No active pilot profile matches this email address.');
      } else if (err.code === 'auth/wrong-password') {
        setErrorMsg('Invalid login credentials configured.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('This email is already linked to another pilot credentials.');
      } else {
        setErrorMsg(err.message || 'Firebase Auth error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBypassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bypassEmail.trim()) return;
    onCustomLogin(bypassEmail.trim(), bypassName.trim() || 'Pilot');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative selection:bg-teal-500 selection:text-slate-900">
      {/* Background flare */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative max-w-7xl w-full mx-auto px-4 py-6 flex items-center justify-between border-b border-slate-900 z-10">
        <button 
          onClick={onBackToLanding}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition font-mono text-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK TO ORBIT
        </button>
        <div className="flex items-center gap-2 select-none">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center font-bold text-slate-950 text-xs text-center">
            Ω
          </div>
          <span className="font-sans font-bold tracking-tight text-sm text-slate-200">
            Life Saver Core
          </span>
        </div>
      </header>

      {/* Main Form Center */}
      <main className="relative flex-grow flex items-center justify-center p-4 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900/60 border border-slate-900 backdrop-blur-md rounded-2xl p-8 shadow-2xl relative"
        >
          {/* Form Header */}
          <div className="text-center mb-6">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {mode === 'signin' && 'Authenticate Pilot credentials'}
              {mode === 'signup' && 'Register secure callsign'}
              {mode === 'forgot' && 'Reset access coordinates'}
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {mode === 'signin' && 'Sign in to access persistent AI agent co-op and shadow models.'}
              {mode === 'signup' && 'Create your account to prevent clearance issues and cache wipe loss.'}
              {mode === 'forgot' && 'Confirm your email to dispatch password-reset credentials.'}
            </p>
          </div>

          {/* Feedback alerts */}
          {errorMsg && (
            <div className="mb-5 bg-rose-950/40 border border-rose-900 p-3 rounded-lg text-rose-205 text-xs font-mono flex gap-2 items-start">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 bg-emerald-950/40 border border-emerald-900 p-3 rounded-lg text-emerald-250 text-xs font-mono flex gap-2 items-start">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {!showBypass ? (
            <>
              {/* Main Submit Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase mb-1 flex items-center gap-1.5 matchesSelector">
                    <Mail className="w-3 h-3 text-teal-500" />
                    EMAIL PORT
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="pilot@orbital-station.space"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 hover:border-slate-700 text-sm text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-teal-500 transition font-sans"
                  />
                </div>

                {mode !== 'forgot' && (
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 font-semibold uppercase mb-1 flex items-center justify-between matchesSelector">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-teal-400" />
                        SECRET KEY
                      </span>
                      {mode === 'signin' && (
                        <button 
                          type="button"
                          onClick={() => { setMode('forgot'); resetMessages(); }}
                          className="text-[9px] font-mono hover:text-white lowercase border-b border-dotted border-slate-500"
                        >
                          forgot key?
                        </button>
                      )}
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-850 hover:border-slate-700 text-sm text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-teal-500 transition font-sans"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold text-xs font-mono rounded-xl tracking-wider hover:shadow-lg hover:shadow-teal-500/10 cursor-pointer transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{mode === 'signin' ? 'ESTABLISH PERSISTENT SESSION' : mode === 'signup' ? 'REGISTER AND SIGN IN' : 'DISPATCH COMMAND'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Toggle auth mode links */}
              <div className="flex justify-between items-center mt-6 text-xs font-mono text-slate-500">
                {mode === 'signin' ? (
                  <>
                    <span>First mission deployment?</span>
                    <button 
                      onClick={() => { setMode('signup'); resetMessages(); }}
                      className="text-teal-400 hover:text-teal-300 underline underline-offset-4 cursor-pointer"
                    >
                      Register Call
                    </button>
                  </>
                ) : (
                  <>
                    <span>Already have pilot clearance?</span>
                    <button 
                      onClick={() => { setMode('signin'); resetMessages(); }}
                      className="text-teal-400 hover:text-teal-300 underline underline-offset-4 cursor-pointer"
                    >
                      Login Call
                    </button>
                  </>
                )}
              </div>

              {/* Spacer divider */}
              <div className="my-6 flex items-center gap-2">
                <div className="h-[1px] bg-slate-900 flex-grow" />
                <span className="text-[10px] font-mono text-slate-600">OR SECURE ACCELERATION</span>
                <div className="h-[1px] bg-slate-900 flex-grow" />
              </div>

              {/* Auth accelerators Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 font-mono text-[11px] rounded-xl cursor-pointer transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                  CONNECT WITH GOOGLE PROVIDER
                </button>
                
                <button
                  onClick={() => setShowBypass(true)}
                  className="w-full text-center text-[10px] font-mono text-slate-500 hover:text-teal-400 underline underline-offset-4 cursor-pointer block"
                >
                  Pop-up blocker issue? Use Pilot ID Bypass
                </button>
              </div>
            </>
          ) : (
            /* Custom Bypass form to bypass third-party restrictions entirely */
            <form onSubmit={handleBypassSubmit} className="space-y-4">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-900 mb-4 text-xs text-slate-400 leading-relaxed">
                🐾 <strong className="text-teal-350">IFrame Rescue System:</strong> When cookie popups are blocked by standard web frames, enter a callsign below. This generates full cloud persistence linked specifically to your identifier.
              </div>
              
              <div>
                <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase mb-1">BYPASS CUSTOM EMAIL</label>
                <input
                  type="email"
                  required
                  placeholder="commander@orbit.space"
                  value={bypassEmail}
                  onChange={(e) => setBypassEmail(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase mb-1">CALLSIGN / CALL NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Maverick"
                  value={bypassName}
                  onChange={(e) => setBypassName(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500 transition font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBypass(false)}
                  className="w-1/3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 rounded-lg text-xs font-mono cursor-pointer transition"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-grow py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-mono font-bold rounded-lg cursor-pointer transition"
                >
                  ESTABLISH RE-ROUTE
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-slate-900 py-6 px-4 z-10 text-center text-[10px] font-mono text-slate-600">
        SECURITY PROTOCOLS OPERATING VIA SHA-256 ENCRYPTION MATRIX
      </footer>
    </div>
  );
}
