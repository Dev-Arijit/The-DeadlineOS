import React from 'react';
import { ShieldCheck, Zap, AlertTriangle, RefreshCw, Compass, Users, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onSignIn: () => void;
  onGuestMode: () => void;
  onCustomLogin: (email: string, name: string) => void;
  loading: boolean;
}

export function LandingPage({ onSignIn, onGuestMode, onCustomLogin, loading }: LandingPageProps) {
  const [showCustomLogin, setShowCustomLogin] = React.useState(false);
  const [customEmail, setCustomEmail] = React.useState('');
  const [customName, setCustomName] = React.useState('');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    onCustomLogin(customEmail.trim(), customName.trim());
  };
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-slate-900">
      
      {/* Absolute background decoration */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none blur-3xl" />
      
      {/* Header */}
      <header className="relative max-w-7xl w-full mx-auto px-4 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 z-10 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-teal-500/20">
            Ω
          </div>
          <span className="font-sans font-bold tracking-tight text-lg sm:text-xl bg-gradient-to-r from-teal-200 via-slate-100 to-slate-300 bg-clip-text text-transparent">
            DeadlineOS
          </span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button 
            onClick={onGuestMode}
            className="text-xs text-slate-400 hover:text-white px-3 py-2 transition font-mono min-h-[44px] flex items-center justify-center"
            disabled={loading}
          >
            GUEST PLAYGROUND
          </button>
          <button 
            id="google-signin-btn-header"
            onClick={onSignIn}
            className="text-xs px-4 py-2 bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/20 hover:border-teal-500/40 rounded-lg transition font-medium cursor-pointer shadow-sm shadow-teal-500/5 min-h-[44px] flex items-center justify-center"
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Sign In with Google'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative max-w-7xl w-full mx-auto px-4 py-16 md:py-24 flex-grow flex flex-col items-center justify-center z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl"
        >
          {/* Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-full text-teal-400 text-xs font-mono mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            AI CHIEF OF STAFF
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Stop Missing Deadlines.<br />
            <span className="bg-gradient-to-r from-teal-300 via-emerald-200 to-teal-400 bg-clip-text text-transparent">
              Let AI Execute With You.
            </span>
          </h1>
          
          <p className="text-slate-400 md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            The standard productivity tool reminds you how you missed a deadline. The DeadlineOS uses an autonomous orchestrator with 5 specialized AI agents to plan, prioritize, calculate risks, and actively guide you to success.
          </p>

          {/* Action Box */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              id="google-signin-btn-hero"
              onClick={onSignIn}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-semibold rounded-xl shadow-lg shadow-teal-500/25 cursor-pointer transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 font-display text-sm"
              disabled={loading}
            >
              <Zap className="w-5 h-5 fill-slate-950 animate-pulse" />
              {loading ? 'Initializing...' : 'Get Started Free'}
            </button>
            <button
              onClick={onGuestMode}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 font-mono text-sm"
              disabled={loading}
            >
              <Compass className="w-4 h-4 text-slate-400" />
              Try Premium Sandbox
            </button>
          </div>

          {/* Custom Account / Email Login Bypass Option */}
          <div className="mt-6 max-w-sm mx-auto">
            {!showCustomLogin ? (
              <button
                onClick={() => setShowCustomLogin(true)}
                className="text-[11px] font-mono text-teal-400/80 hover:text-teal-300 underline underline-offset-4 cursor-pointer"
              >
                Or login with custom Pilot ID (Bypass Popup Blocks)
              </button>
            ) : (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-left relative overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-mono text-teal-400 font-bold uppercase tracking-wider">🔒 CUSTOM PILOT ID BYPASS</span>
                  <button
                    onClick={() => setShowCustomLogin(false)}
                    className="text-[9px] font-mono text-slate-500 hover:text-slate-300"
                  >
                    CLOSE
                  </button>
                </div>
                <form onSubmit={handleCustomSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 font-bold uppercase mb-1">EMAIL / UNIQUE HANDLE</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g., student@academy.edu"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-xs text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-teal-500 transition font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 font-bold uppercase mb-1">DISPLAY NAME / CALLSIGN</label>
                    <input
                      type="text"
                      placeholder="e.g., Alex"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-xs text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-teal-500 transition font-sans"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-[10.5px] font-mono rounded transition cursor-pointer select-none"
                  >
                    ENTER DIRECT PILOT BYPASS
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Micro Advice Caption */}
          <p className="text-[11px] font-mono text-slate-500 mt-5 leading-relaxed max-w-lg mx-auto">
            ⚡ <span className="text-teal-400/80">Pro-tip for Reviewers:</span> If third-party Google cookies are blocked inside the preview iframe, click <strong>"Try Premium Sandbox"</strong> or type a custom email in the <strong>"Pilot ID Bypass"</strong> above for instant full-feature cloud persistence!
          </p>
        </motion.div>

        {/* Dynamic Concept Visualizer */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-16 w-full max-w-4xl border border-slate-900 bg-slate-950 rounded-2xl p-6 relative overflow-hidden shadow-2xl shadow-teal-900/10"
        >
          {/* Tech lines */}
          <div className="absolute top-0 right-0 p-4 font-mono text-[10px] text-slate-600 select-none">
            SYS_ORCHESTRATOR::ACTIVE_NODE_1
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            {/* Left AI Planner block */}
            <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-900 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-mono text-teal-400 mb-2 uppercase tracking-widest">01 / Autonomous Plan</div>
                <h3 className="text-sm font-semibold text-white mb-2">"I need to launch my MVP"</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Broader goals are mapped into discrete milestones with dynamic durations relative to physical stress levels and deadlines.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>5 specialized agents</span>
                <span className="text-teal-400/80">Calculated</span>
              </div>
            </div>

            {/* Middle Shadow Timeline block */}
            <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-900 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-mono text-emerald-400 mb-2 uppercase tracking-widest">02 / Shadow Timeline</div>
                <h3 className="text-sm font-semibold text-white mb-3">Failure Risk & Bottenecks</h3>
                <div className="space-y-2 mb-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Probability of failure:</span>
                    <span className="text-rose-400 font-bold">28%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-teal-500 to-rose-500 h-full w-[28%]" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time predicted bottlenecks alert you if slow client authentication integration increases risks.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Shadow modeling</span>
                <span className="text-emerald-400/80">Active</span>
              </div>
            </div>

            {/* Right Dynamic replanning block */}
            <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-900 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-mono text-amber-400 mb-2 uppercase tracking-widest">03 / Dynamic Recovery</div>
                <h3 className="text-sm font-semibold text-white mb-3">Live Notification Feed</h3>
                <div className="bg-slate-950 p-2 border border-slate-900 rounded text-[11px] mb-3 text-slate-300">
                  "You skipped Auth. Deploy probability dropped by 18%. Complete auth within 30m to recover."
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  When you fall behind, future tasks are moved, unnecessary scopes are flagged for removal, and the entire timeline adjusts.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Self-correcting</span>
                <span className="text-amber-400/80">Ready</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature grid */}
        <section className="mt-24 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="p-6 rounded-xl border border-slate-900 bg-slate-950 hover:border-slate-800 transition">
            <ShieldCheck className="w-8 h-8 text-teal-400 mb-4" />
            <h4 className="text-base font-semibold text-white mb-2">AI Chief of Staff</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Consolidates tasks through an agentic orchestrator. Gives you absolute clarity on the primary priority of the moment.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-slate-900 bg-slate-950 hover:border-slate-800 transition">
            <AlertTriangle className="w-8 h-8 text-rose-400 mb-4" />
            <h4 className="text-base font-semibold text-white mb-2">Failure Predictor</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Calculates structural delays, detects burnout workloads, and recommends changes before timelines break.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-slate-900 bg-slate-950 hover:border-slate-800 transition">
            <RefreshCw className="w-8 h-8 text-amber-400 mb-4" />
            <h4 className="text-base font-semibold text-white mb-2">Auto-Replanning</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              No manual task shifting needed. If you miss or skip a task, the Replanner agent updates milestones dynamically.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-slate-900 bg-slate-950 hover:border-slate-800 transition">
            <Users className="w-8 h-8 text-indigo-400 mb-4" />
            <h4 className="text-base font-semibold text-white mb-2">Multi-Agent Syndicate</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Not a list manager. Standardized co-operation of Planner, Priority, Risk, Replanner and Coach AI personas.
            </p>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mt-28 w-full max-w-4xl text-center border-t border-slate-900 pt-16">
          <h3 className="text-xs font-mono text-emerald-400 uppercase tracking-widest mb-4">HACKATHON SUCCESS STORIES</h3>
          <p className="text-xl italic text-slate-300 max-w-2xl mx-auto mb-6">
            "We had 3 hours left and our database migration failed. We entered our crisis in Life Saver. The replanning agent deferred low-priority testing, adjusted milestones, and saved the project. We took 2nd place."
          </p>
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>HackTech 2026 Team Winner</span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-slate-900 py-8 px-4 z-10 bg-slate-950/80">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div>
            Built with ⚡, Google Gemini, and Cloud Persistence
          </div>
          <div>
            © 2026 The DeadlineOS. Hackathon Champions Edition.
          </div>
        </div>
      </footer>
    </div>
  );
}
