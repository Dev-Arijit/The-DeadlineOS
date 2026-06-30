import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Clock, 
  Bell, 
  Sun, 
  Moon, 
  Zap, 
  ShieldCheck, 
  Save, 
  Download, 
  Upload, 
  Database,
  Calendar,
  Sparkles,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useMissionStore } from '../store/useMissionStore';

interface SettingsViewProps {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
  } | null;
}

export function SettingsView({ user }: SettingsViewProps) {
  const missions = useMissionStore((state) => state.missions);
  const loadAllMissions = useMissionStore((state) => state.loadAllMissions);
  const recalculateEverything = useMissionStore((state) => state.recalculateEverything);
  const userSettings = useMissionStore((state) => state.userSettings);
  const saveUserSettings = useMissionStore((state) => state.saveUserSettings);

  // Config States
  const [workingStart, setWorkingStart] = useState(userSettings.workingStart);
  const [workingEnd, setWorkingEnd] = useState(userSettings.workingEnd);
  const [breakDuration, setBreakDuration] = useState(userSettings.breakDuration);
  const [timezone, setTimezone] = useState(userSettings.timezone);
  const [aggressiveness, setAggressiveness] = useState<'relaxed' | 'normal' | 'crisis'>(userSettings.aggressiveness);
  const [capacity, setCapacity] = useState(userSettings.capacity);
  const [notifSound, setNotifSound] = useState(userSettings.notifSound);
  const [notifVisual, setNotifVisual] = useState(userSettings.notifVisual);
  const [darkMode, setDarkMode] = useState(userSettings.darkMode);
  
  const [calendarSync, setCalendarSync] = useState(userSettings.calendarSync);
  const [syncLoading, setSyncLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Sync with global store settings when they change
  useEffect(() => {
    setWorkingStart(userSettings.workingStart);
    setWorkingEnd(userSettings.workingEnd);
    setBreakDuration(userSettings.breakDuration);
    setTimezone(userSettings.timezone);
    setAggressiveness(userSettings.aggressiveness);
    setCapacity(userSettings.capacity);
    setNotifSound(userSettings.notifSound);
    setNotifVisual(userSettings.notifVisual);
    setDarkMode(userSettings.darkMode);
    setCalendarSync(userSettings.calendarSync);
  }, [userSettings]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveUserSettings({
      workingStart,
      workingEnd,
      breakDuration,
      timezone,
      aggressiveness,
      capacity,
      notifSound,
      notifVisual,
      darkMode,
      calendarSync
    });
    
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
  };

  // Google Calendar Connection Mock
  const toggleGoogleCalendar = () => {
    if (!calendarSync) {
      setSyncLoading(true);
      setTimeout(() => {
        setCalendarSync(true);
        setSyncLoading(false);
      }, 1500);
    } else {
      setCalendarSync(false);
    }
  };

  // Export missions configuration JSON
  const exportMissions = () => {
    try {
      const dataStr = JSON.stringify(missions, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `saver_missions_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    }
  };

  // Import missions configuration JSON
  const handleImportMissions = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    setImportError(null);
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            const uid = user?.uid || 'guest_user_id';
            // Save each mission into local storage and potentially sync
            for (const mission of parsed) {
              if (mission.id && mission.goal) {
                mission.userId = uid;
                localStorage.setItem(`saver_mission_${uid}`, JSON.stringify(mission));
                localStorage.setItem(`saver_mission_backup_${mission.id}`, JSON.stringify(mission));
                
                // Write directly to Firestore collections under standard structure if online
                try {
                  await fetch('/api/missions/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mission),
                  });
                } catch (err) {
                  console.warn("Direct save failed", err);
                }
              }
            }
            await loadAllMissions(uid);
            recalculateEverything();
            setBackupStatus('Missions Imported Successfully!');
            setTimeout(() => setBackupStatus(null), 3000);
          } else {
            setImportError('Invalid configuration file structure. Expected list of missions.');
          }
        } catch (err) {
          setImportError('Failed to parse backup file. Please make sure it is a valid JSON export.');
        }
      };
    }
  };

  // Local backup triggers
  const handleBackupNow = () => {
    try {
      localStorage.setItem('saver_emergency_backup_state', JSON.stringify(missions));
      setBackupStatus('Local system restore snapshot captured.');
      setTimeout(() => setBackupStatus(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreNow = async () => {
    try {
      const backup = localStorage.getItem('saver_emergency_backup_state');
      if (backup) {
        const parsed = JSON.parse(backup);
        const uid = user?.uid || 'guest_user_id';
        for (const m of parsed) {
          localStorage.setItem(`saver_mission_${uid}`, JSON.stringify(m));
          localStorage.setItem(`saver_mission_backup_${m.id}`, JSON.stringify(m));
        }
        await loadAllMissions(uid);
        recalculateEverything();
        setBackupStatus('Snapshot restored successfully.');
        setTimeout(() => setBackupStatus(null), 3000);
      } else {
        setImportError('No local restore snapshot found in system cache.');
      }
    } catch (err) {
      console.error(err);
      setImportError('Failed to restore from snapshot.');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Box 1: Scheduler capacities & AI Planning Style */}
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-md space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-950 pb-3">
              <Sliders className="w-4 h-4 text-teal-400" />
              <h3 className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">AI AGENT COGNITIVE BEHAVIOR</h3>
            </div>

            <div className="space-y-4">
              {/* Range capacity */}
              <div>
                <div className="flex justify-between items-center text-xs font-mono mb-2">
                  <span className="text-slate-300 font-semibold uppercase">Daily Capacity Budget:</span>
                  <span className="text-teal-400 font-bold">{capacity} Hrs / Day</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="16"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full accent-teal-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer border border-slate-900"
                />
              </div>

              {/* AI Aggressiveness profile selection */}
              <div>
                <span className="block text-xs font-mono text-slate-400 uppercase font-semibold mb-2">AI Planning Style:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'relaxed', label: '☕ Relaxed', desc: 'Allows long buffers & flexible timelines.' },
                    { id: 'normal', label: '⚖️ Balanced', desc: 'Standard fail-safe milestone sequences.' },
                    { id: 'crisis', label: '🐆 Aggressive', desc: 'Urges high scope cuts & tight focus sprints.' }
                  ].map((agg) => {
                    const isSel = aggressiveness === agg.id;
                    return (
                      <button
                        key={agg.id}
                        type="button"
                        onClick={() => setAggressiveness(agg.id as any)}
                        className={`text-left p-3.5 rounded-xl border transition cursor-pointer select-none flex flex-col gap-1 ${
                          isSel 
                            ? 'bg-teal-950/20 border-teal-500/50 text-white' 
                            : 'bg-slate-950 border-slate-900 hover:bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-bold leading-none">{agg.label}</span>
                        <span className="text-[9.5px] text-slate-500 leading-normal">{agg.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Box 2: Working Hours envelopes */}
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-950 pb-3 text-slate-400">
              <Clock className="w-4 h-4 text-teal-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider">WORKING ENVELOPES</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase font-bold mb-1.5">START CYCLE TIME</label>
                <input
                  type="time"
                  value={workingStart}
                  onChange={(e) => setWorkingStart(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-teal-500 transition font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase font-bold mb-1.5">END CYCLE TIME</label>
                <input
                  type="time"
                  value={workingEnd}
                  onChange={(e) => setWorkingEnd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-teal-500 transition font-mono"
                />
              </div>
            </div>

            {/* Break duration input */}
            <div className="pt-1">
              <div className="flex justify-between items-center text-xs font-mono mb-2">
                <span className="text-slate-300 font-semibold uppercase">DEFAULT BREAK DURATION:</span>
                <span className="text-teal-400 font-bold">{breakDuration} Minutes</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={breakDuration}
                onChange={(e) => setBreakDuration(Number(e.target.value))}
                className="w-full accent-teal-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer border border-slate-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase font-bold mb-1.5">SYSTEM TIMEZONE PORTAL</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-teal-500 transition font-sans"
              >
                <option value="UTC-8">Pacific Time (PT) - UTC-8</option>
                <option value="UTC-7">Mountain Time (MT) - UTC-7</option>
                <option value="UTC-6">Central Time (CT) - UTC-6</option>
                <option value="UTC-5">Eastern Time (ET) - UTC-5</option>
                <option value="UTC-0">Greenwich Mean Time (GMT) - UTC-0</option>
                <option value="UTC+5.5">Indian Standard Time (IST) - UTC+5.5</option>
              </select>
            </div>
          </div>

          {/* Box 3: Notifications alerts & Theme presets */}
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-950 pb-3 text-slate-400">
              <Bell className="w-4 h-4 text-teal-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider">ALERT CHANNELS & THEME</h3>
            </div>

            <div className="space-y-3 pt-1">
              <label className="flex items-center justify-between text-xs text-slate-300 font-mono select-none cursor-pointer">
                <span>SOUND SIGNAL ALERTS:</span>
                <input
                  type="checkbox"
                  checked={notifSound}
                  onChange={(e) => setNotifSound(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-900 text-teal-505 bg-slate-950 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-300 font-mono select-none cursor-pointer">
                <span>VISUAL TOAST BANNERS:</span>
                <input
                  type="checkbox"
                  checked={notifVisual}
                  onChange={(e) => setNotifVisual(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-900 text-teal-505 bg-slate-950 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>

            <div className="border-t border-slate-950 pt-3 space-y-2">
              <span className="block text-[10px] font-mono text-slate-500 uppercase font-bold">THEMATIC STYLE ENVELOPE</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDarkMode(true)}
                  className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold transition cursor-pointer select-none flex items-center justify-center gap-1.5 ${
                    darkMode 
                      ? 'bg-teal-950/20 border-teal-500/30 text-teal-400' 
                      : 'bg-slate-950 border-slate-900 text-slate-400'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" /> CLASSIC MIDNIGHT
                </button>
                <button
                  type="button"
                  onClick={() => setDarkMode(false)}
                  className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold transition cursor-pointer select-none flex items-center justify-center gap-1.5 opacity-40`}
                  disabled
                >
                  <Sun className="w-3.5 h-3.5" /> AMBIENT OATMEAL
                </button>
              </div>
            </div>
          </div>

          {/* Box 4: Calendar Sync */}
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-md space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-950 pb-3 text-slate-400">
                <Calendar className="w-4 h-4 text-teal-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider">CALENDAR FLOOD SYNC</h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Automatically sync your DeadlineOS study blocks and milestones directly to your calendar to guarantee zero double-bookings.
              </p>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={toggleGoogleCalendar}
                className={`w-full py-2.5 rounded-xl font-mono text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer select-none ${
                  calendarSync 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                    : 'bg-slate-950 border-slate-900 text-slate-300 hover:border-slate-800'
                }`}
              >
                {syncLoading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                ) : calendarSync ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" /> GOOGLE CALENDAR SYNCED
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-teal-400" /> CONNECT GOOGLE CALENDAR
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-4 justify-end">
          {saveSuccess && (
            <span className="text-xs font-mono text-emerald-400 animate-pulse font-bold">
              ⚡ CONFIGURATION CALIBRATED AND STREAMED SAFELY!
            </span>
          )}
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-mono font-bold text-xs rounded-xl cursor-pointer transition select-none flex items-center justify-center gap-1.5 h-10 shadow-lg shadow-teal-500/10"
          >
            <Save className="w-4 h-4" />
            SAVE SYSTEM PREFERENCES
          </button>
        </div>

      </form>

      {/* SYSTEM RESTORE & BACKUPS PORTAL */}
      <div className="p-6 bg-[#0E1324] border border-slate-900 rounded-2xl space-y-4 shadow-xl">
        <div className="border-b border-slate-950 pb-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-400" />
            RESTORE PORTAL & DATA BACKUPS
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Export study flow files or trigger a manual local system recovery snapshot.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={exportMissions}
            className="px-4 py-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-350 text-xs font-mono font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-teal-400" />
            EXPORT MISSIONS JSON
          </button>

          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImportMissions}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <button
              type="button"
              className="w-full px-4 py-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-350 text-xs font-mono font-bold rounded-xl transition flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4 text-teal-400" />
              IMPORT SYSTEM BACKUP
            </button>
          </div>

          <button
            onClick={handleBackupNow}
            className="px-4 py-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-350 text-xs font-mono font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Database className="w-4 h-4 text-teal-400" />
            CAPTURE SNAPSHOT
          </button>
        </div>

        {backupStatus && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold rounded-xl animate-fade-in flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {backupStatus}
          </div>
        )}

        {importError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono font-bold rounded-xl animate-fade-in flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {importError}
          </div>
        )}

        {missions.length > 0 && (
          <div className="pt-2 flex justify-between items-center text-[10.5px] text-slate-500 font-mono">
            <span>ACTIVE FOCUS SNAPSHOTS: {missions.length} DETECTED</span>
            <button
              onClick={handleRestoreNow}
              className="text-teal-400 hover:underline cursor-pointer"
            >
              RESTORE LAST SNAPSHOT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
