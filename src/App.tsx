import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  auth, 
  googleProvider 
} from './lib/firebase';
import { useMissionStore } from './store/useMissionStore';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { Activity, AlertTriangle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const currentUser = useMissionStore((state) => state.currentUser);
  const setCurrentUser = useMissionStore((state) => state.setCurrentUser);
  const loadAllMissions = useMissionStore((state) => state.loadAllMissions);
  const loading = useMissionStore((state) => state.loading);
  const isCreatingNewMission = useMissionStore((state) => state.isCreatingNewMission);

  const [authLoading, setAuthLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const userPayload = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'Member',
          };
          setCurrentUser(userPayload);
          await loadAllMissions(user.uid);
        } else {
          const guestSession = localStorage.getItem('saver_guest_user');
          if (guestSession) {
            const parsed = JSON.parse(guestSession);
            setCurrentUser(parsed);
            await loadAllMissions(parsed.uid || 'guest_user_id');
          } else {
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error('Error during auth status propagation:', err);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setCurrentUser, loadAllMissions]);

  const userSettings = useMissionStore((state) => state.userSettings);

  useEffect(() => {
    if (userSettings.darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [userSettings.darkMode]);

  // 2. Google sign-in
  const handleSignIn = async () => {
    setAuthLoading(true);
    setErrorMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const u = result.user;
        const userPayload = {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || u.email?.split('@')[0] || 'Member',
        };
        setCurrentUser(userPayload);
        await loadAllMissions(u.uid);
      }
    } catch (err: any) {
      console.error('Signin popup blocked or failed:', err);
      if (err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('popup-closed')) {
        setErrorMessage(
          'Google Login Popup was closed before authentication was completed. Please make sure the popup remains open, or try our instant "Premium Sandbox" with zero sign-in required!'
        );
      } else {
        setErrorMessage(
          'Your browser blocked the OAuth pop-up. Please click "Try Premium Sandbox" for continuous offline-first preview, or open the app in a new tab!'
        );
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // 3. Guest Mode fallback
  const handleGuestMode = async () => {
    setErrorMessage(null);
    setAuthLoading(true);
    const guestUser = {
      uid: 'guest_user_id',
      displayName: 'Guest Pilot',
      email: 'guest@example.com',
    };
    localStorage.setItem('saver_guest_user', JSON.stringify(guestUser));
    setCurrentUser(guestUser);
    await loadAllMissions('guest_user_id');
    setAuthLoading(false);
  };

  // 4. Custom Login Mode
  const handleCustomLogin = async (email: string, name: string) => {
    setErrorMessage(null);
    setAuthLoading(true);
    try {
      const sanitizedUid = `custom_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const userPayload = {
        uid: sanitizedUid,
        email: email.trim(),
        displayName: name.trim() || email.split('@')[0],
      };
      
      localStorage.setItem('saver_guest_user', JSON.stringify(userPayload));
      setCurrentUser(userPayload);
      await loadAllMissions(sanitizedUid);
    } catch (err: any) {
      console.error('Custom Pilot login fail:', err);
      setErrorMessage('Could not establish custom session link: ' + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // 5. Sign out
  const handleSignOut = async () => {
    setErrorMessage(null);
    setAuthLoading(true);
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('saver_guest_user');
    localStorage.removeItem('saver_guest_mission');
    setCurrentUser(null);
    setAuthLoading(false);
  };

  // Absolute Main Layout Loader
  if (authLoading || (loading && !currentUser)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <Activity className="w-8 h-8 text-teal-400 animate-pulse mb-4" />
        <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">BOOTING DEEP STAFF INFRASTRUCTURE...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      
      {/* Toast Alert Banner for Error Messages */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-rose-950 border-b border-rose-800 text-rose-200 px-4 py-3 text-center text-xs font-mono relative z-50 flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-rose-450 shrink-0" />
            <span>{errorMessage}</span>
            <button 
              onClick={() => setErrorMessage(null)} 
              className="ml-3 font-bold hover:text-white px-2 cursor-pointer border border-rose-800 rounded bg-rose-900/50"
            >
              DISMISS
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global API State Blocking Spinner */}
      {loading && currentUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl flex flex-col items-center text-center max-w-sm shadow-2xl">
            <RotateCcw className="w-8 h-8 text-teal-400 animate-spin mb-4" />
            <h3 className="font-bold text-white text-base mb-1">Synthesizing Agent Cascade</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Planner, Priority, Risk, and Coach AI agents are aligning dependencies to structure your custom schedule...
            </p>
            <div className="w-48 bg-slate-950 h-1 rounded-full overflow-hidden">
              <div className="bg-teal-500 h-full w-[60%] animate-pulse animate-infinite" />
            </div>
          </div>
        </div>
      )}

      {/* Login vs Dashboard State routing */}
      {!currentUser ? (
        <LandingPage 
          onSignIn={handleSignIn} 
          onGuestMode={handleGuestMode} 
          onCustomLogin={handleCustomLogin}
          loading={authLoading} 
        />
      ) : (
        <Dashboard 
          user={currentUser}
          onSignOut={handleSignOut}
        />
      )}

    </div>
  );
}
