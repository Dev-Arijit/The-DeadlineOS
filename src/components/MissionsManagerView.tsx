import React, { useState } from 'react';
import { 
  Folder, 
  Plus, 
  Trash2, 
  Check, 
  Calendar, 
  AlertTriangle, 
  Flame, 
  Sparkles, 
  CheckCircle,
  ExternalLink,
  MessageSquare,
  Bookmark,
  ArrowLeft,
  Clock
} from 'lucide-react';
import { Mission, Task, calculateMissionProgress } from '../types';
import { useMissionStore } from '../store/useMissionStore';
import { motion } from 'motion/react';

interface MissionsManagerViewProps {
  missions: Mission[];
  activeMissionId: string | null;
  setActiveMissionId: (id: string | null) => void;
  deleteMission: (id: string) => Promise<void>;
  setIsCreatingNewMission: (val: boolean) => void;
  setActiveTab: (tab: 'mission' | 'tasks' | 'streams' | 'strategist' | 'calendar' | 'agents' | 'settings') => void;
}

const formatSafeDate = (isoString: any, options?: Intl.DateTimeFormatOptions) => {
  if (!isoString || typeof isoString !== 'string') return 'Flexible Target';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return isoString;
    }
    if (options && ('dateStyle' in options || 'timeStyle' in options)) {
      return d.toLocaleString([], options);
    }
    return d.toLocaleDateString(undefined, options || { month: 'short', day: 'numeric' });
  } catch {
    return isoString;
  }
};

export function MissionsManagerView({
  missions,
  activeMissionId,
  setActiveMissionId,
  deleteMission,
  setIsCreatingNewMission,
  setActiveTab
}: MissionsManagerViewProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [missionToDelete, setMissionToDelete] = useState<{ id: string; title: string } | null>(null);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

  const handleDeleteTrigger = (id: string, title: string) => {
    setMissionToDelete({ id, title });
  };

  const handleConfirmDelete = async () => {
    if (!missionToDelete) return;
    const { id } = missionToDelete;
    setDeletingId(id);
    try {
      await deleteMission(id);
    } catch (err) {
      console.error("Failed to delete mission:", err);
    } finally {
      setDeletingId(null);
      setMissionToDelete(null);
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
      case 'low':
        return 'bg-teal-500/10 border-teal-500/20 text-teal-400';
      default:
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400';
      case 'active':
        return 'bg-sky-500/15 border border-sky-500/30 text-sky-400';
      case 'expired':
        return 'bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold';
      default:
        return 'bg-slate-800 border border-slate-700 text-slate-300';
    }
  };

  const handleAskAIAboutStream = (m: Mission) => {
    // Send a message to AI strategist automatically by triggering a tab shift and putting input
    // To do this, we can set the chatInput in Dashboard or just tell them we prefilled it
    setActiveTab('strategist');
    // We can also trigger an immediate AI recommendation
    const state = useMissionStore.getState();
    // Pre-fill chat in the next cycle or immediately trigger a message
    setTimeout(() => {
      const chatInputEl = document.querySelector('input[placeholder*="Ask your AI Strategist"]') as HTMLInputElement;
      if (chatInputEl) {
        chatInputEl.value = `Analyze my focus stream "${m.title || m.goal}" in detail. Give me a 3-bullet action plan to overcome any bottlenecks or deadlines!`;
        // Trigger React change event
        const event = new Event('input', { bubbles: true });
        chatInputEl.dispatchEvent(event);
        // Find send button and click it
        const sendBtn = chatInputEl.closest('div')?.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (sendBtn) {
          sendBtn.click();
        }
      }
    }, 100);
  };

  if (selectedMissionId) {
    const m = missions.find(x => x.id === selectedMissionId);
    if (m) {
      const completedCount = (m.tasks || []).filter(t => t && t.status === 'completed').length;
      const totalCount = (m.tasks || []).filter(Boolean).length;
      const progress = calculateMissionProgress(m);
      const failureProb = m.failurePrediction?.probability || 0;
      const isActive = m.id === activeMissionId;

      return (
        <div className="space-y-6 animate-fade-in text-white">
          {/* Back Header */}
          <div className="flex justify-between items-center bg-slate-900/30 p-4 rounded-xl border border-slate-900">
            <button
              onClick={() => setSelectedMissionId(null)}
              className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-mono font-bold uppercase rounded-lg transition cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-teal-400" />
              BACK TO STREAMS
            </button>
            <div className="flex gap-2 font-mono">
              {isActive ? (
                <span className="px-2.5 py-1 bg-teal-500 text-slate-950 text-[9px] font-black uppercase rounded-full">
                  🟢 ACTIVE RUNNING CONTEXT
                </span>
              ) : (
                <button
                  onClick={() => {
                    setActiveMissionId(m.id);
                    useMissionStore.getState().addSystemNotification('Context Switched', `Active stream changed to "${m.title || m.goal}"`, 'info');
                  }}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-750 text-teal-400 text-[9px] font-bold uppercase rounded-lg transition cursor-pointer"
                >
                  Activate Stream
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Mission Description and Tasks */}
            <div className="lg:col-span-7 space-y-6">
              {/* Mission Metadata Card */}
              <div className="bg-[#0D1222]/35 border border-slate-900 rounded-2xl p-6 space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono font-black text-teal-400 tracking-wider uppercase">STREAM SPECIFICATION</span>
                  <h2 className="text-xl font-black text-white tracking-tight">{m.title || 'Untitled Stream'}</h2>
                  <p className="text-xs text-slate-350 leading-relaxed font-sans">{m.goal}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-950 text-xs font-mono font-bold uppercase">
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-500 block">Priority</span>
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] ${getPriorityStyle(m.priority || 'medium')}`}>
                      {m.priority}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-500 block">Status</span>
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] ${getStatusStyle(m.status)}`}>
                      {m.status}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-500 block">CONFIDENCE</span>
                    <span className="text-emerald-400 text-[9.5px]">{m.confidenceScore}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-450 font-bold uppercase">Task Completion</span>
                    <span className="text-white font-extrabold">{progress}% ({completedCount}/{totalCount})</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                    <div 
                      className="h-full bg-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tasks of that Mission */}
              <div className="bg-[#0D1222]/35 border border-slate-900 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-950 pb-3">
                  <h3 className="text-xs font-bold font-mono uppercase text-white tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-teal-400" />
                    Focus Stream Deliverables ({totalCount})
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">SORTED BY PRIORITY SEQUENCE</span>
                </div>

                <div className="space-y-3">
                  {m.tasks && m.tasks.filter(Boolean).length > 0 ? (
                    [...m.tasks]
                      .filter(Boolean)
                      .sort((a, b) => {
                        const pWeights = { high: 3, medium: 2, low: 1 };
                        const pA = pWeights[a?.priority || 'medium'] || 2;
                        const pB = pWeights[b?.priority || 'medium'] || 2;
                        if (pA !== pB) return pB - pA;
                        return (a?.order ?? 0) - (b?.order ?? 0);
                      })
                      .map((t, idx) => (
                      <div 
                        key={t.id} 
                        className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-colors ${
                          t.status === 'completed' 
                            ? 'bg-emerald-950/5 border-emerald-900/10' 
                            : t.status === 'skipped'
                            ? 'bg-slate-950/40 border-slate-900/60 opacity-60'
                            : 'bg-slate-950/60 border-slate-900/80 hover:bg-slate-900/40'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                              <h4 className={`text-xs font-bold ${t.status === 'completed' ? 'text-emerald-400 line-through' : 'text-white'}`}>
                                {t.name}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{t.description}</p>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1.5 shrink-0 text-[9px] font-mono">
                            <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                              t.status === 'completed' 
                                ? 'bg-emerald-500/15 text-emerald-400' 
                                : t.status === 'skipped' 
                                ? 'bg-slate-800 text-slate-455' 
                                : 'bg-amber-500/15 text-amber-400'
                            }`}>
                              {t.status}
                            </span>
                            <span className="text-slate-500 font-medium uppercase">{t.durationMinutes} Mins</span>
                          </div>
                        </div>

                        {t.reasoning && (
                          <div className="p-2.5 bg-slate-950/50 border border-slate-900/60 rounded-lg text-[10px] text-slate-400 italic leading-normal">
                            "{t.reasoning}"
                          </div>
                        )}
                        
                        {t.scheduledTime && (
                          <div className="text-[9.5px] font-mono text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-teal-400" />
                            Planned for: {t.scheduledTime}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic py-4 text-center">No tasks configured for this stream.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Risk and Timeline Factors */}
            <div className="lg:col-span-5 space-y-6">
              {/* AI Predictive Risk Analysis Block */}
              <div className="bg-[#0D1222]/35 border border-slate-900 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-950 pb-3">
                  <h3 className="text-xs font-bold font-mono uppercase text-white tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    AI Predictive Risk Diagnostic
                  </h3>
                  <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                    failureProb > 60 ? 'bg-rose-500/15 text-rose-400' : failureProb > 30 ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
                  }`}>
                    RISK: {failureProb}%
                  </span>
                </div>

                <div className="space-y-4 leading-relaxed font-sans text-xs">
                  {/* Gauge indicator */}
                  <div className="p-4 bg-slate-950/80 border border-slate-900 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-center text-[10px] font-mono uppercase text-slate-500">
                      <span>Timeline Safety Margin</span>
                      <span className={failureProb > 60 ? 'text-rose-400' : 'text-emerald-400'}>
                        {100 - failureProb}% Secure
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          failureProb > 60 ? 'bg-rose-500' : 'bg-teal-500'
                        }`}
                        style={{ width: `${100 - failureProb}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-slate-950/50 border border-slate-900 rounded-xl space-y-1">
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block">Predicted Bottleneck</span>
                      <p className="text-slate-200 leading-normal font-sans font-medium">
                        {m.failurePrediction?.bottleneck || "No bottlenecks predicted. Smooth delivery cycle expected."}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950/50 border border-slate-900 rounded-xl space-y-1">
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block">AI Risk Mitigation Plan</span>
                      <p className="text-teal-300 leading-normal font-sans font-semibold">
                        {m.failurePrediction?.suggestedFix || "Secure continuous block intervals to boost performance confidence."}
                      </p>
                    </div>

                    {m.failurePrediction?.reason && (
                      <div className="p-3 bg-slate-950/50 border border-slate-900 rounded-xl space-y-1">
                        <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block">Failure Predictor Attribution</span>
                        <p className="text-slate-400 leading-normal font-sans">
                          {m.failurePrediction?.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Shadow Timeline Factors */}
              <div className="bg-[#0D1222]/35 border border-slate-900 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-950 pb-3">
                  <h3 className="text-xs font-bold font-mono uppercase text-white tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-teal-400" />
                    AI Shadow Timeline Bounds
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">MONTE CARLO PROJECTIONS</span>
                </div>

                <div className="space-y-4">
                  {m.shadowTimeline ? (
                    <div className="space-y-3.5">
                      <div className="grid grid-cols-3 gap-2.5 text-center">
                        <div className="p-2.5 bg-emerald-950/10 border border-emerald-900/10 rounded-xl">
                          <span className="text-[8px] font-mono font-bold text-slate-500 block uppercase">Best Case</span>
                          <span className="text-sm font-extrabold text-emerald-400 font-mono">
                            {m.shadowTimeline.bestCaseHours} hrs
                          </span>
                        </div>
                        <div className="p-2.5 bg-teal-950/10 border border-teal-900/10 rounded-xl">
                          <span className="text-[8px] font-mono font-bold text-slate-500 block uppercase">Expected</span>
                          <span className="text-sm font-extrabold text-teal-400 font-mono">
                            {m.shadowTimeline.expectedCaseHours} hrs
                          </span>
                        </div>
                        <div className="p-2.5 bg-rose-950/10 border border-rose-900/10 rounded-xl">
                          <span className="text-[8px] font-mono font-bold text-slate-500 block uppercase">Worst Case</span>
                          <span className="text-sm font-extrabold text-rose-400 font-mono">
                            {m.shadowTimeline.worstCaseHours} hrs
                          </span>
                        </div>
                      </div>

                      <div className="text-[10.5px] text-slate-450 font-sans leading-relaxed text-center px-1">
                        Worst Case represents potential schedule slippage under peak cognitive friction or interruptions.
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic text-center py-2">No shadow timeline bounds calculated yet.</p>
                  )}
                </div>
              </div>

              {/* Milestones timeline */}
              <div className="bg-[#0D1222]/35 border border-slate-900 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-950 pb-3">
                  <h3 className="text-xs font-bold font-mono uppercase text-white tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-teal-400" />
                    Milestones Track
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">STAGE TARGETS</span>
                </div>

                <div className="space-y-3">
                  {m.milestones && m.milestones.filter(Boolean).length > 0 ? (
                    m.milestones.filter(Boolean).map((ms, idx) => (
                      <div key={idx} className="flex gap-3 items-start border-l border-slate-850 pl-3 ml-1.5 relative py-1">
                        <div className="absolute left-[-4.5px] top-2.5 w-2 h-2 rounded-full bg-teal-500 shadow shadow-teal-500/50" />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white font-sans">{ms.name}</h4>
                            {ms && 'targetPercentage' in ms && (
                              <span className="px-1 py-0.2 bg-slate-950 text-teal-400 text-[8px] font-mono rounded font-bold">
                                {(ms as any).targetPercentage}%
                              </span>
                            )}
                          </div>
                          <span className="text-[9.5px] font-mono text-slate-500">
                            Target: {formatSafeDate(ms.deadline, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic text-center py-2">No stage milestones calculated.</p>
                  )}
                </div>
              </div>

              {/* Decision Log */}
              <div className="bg-[#0D1222]/35 border border-slate-900 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-950 pb-3">
                  <h3 className="text-xs font-bold font-mono uppercase text-white tracking-wider flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4 text-teal-400" />
                    AI Strategist Decision Log
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">AUDIT LOG</span>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {m.decisionLog && m.decisionLog.filter(Boolean).length > 0 ? (
                    m.decisionLog.filter(Boolean).map((d, idx) => (
                      <div key={idx} className="p-3 bg-slate-950/40 border border-slate-900/60 rounded-xl space-y-1.5 text-[11px]">
                        <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase">
                          <span className="text-teal-400">Agent: {d?.agent}</span>
                          <span className="text-slate-500">{d?.timestamp}</span>
                        </div>
                        <h5 className="font-extrabold text-white leading-tight">{d?.action}</h5>
                        <p className="text-slate-400 leading-normal font-sans italic">"{d?.reasoning}"</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic text-center py-2">No agent actions recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/30 p-5 rounded-2xl border border-slate-900">
        <div>
          <h2 className="text-sm font-bold font-mono uppercase text-white tracking-widest flex items-center gap-2">
            <Folder className="w-4 h-4 text-teal-400" />
            ALL ACTIVE & PLANNED FOCUS STREAMS
          </h2>
          <p className="text-[10px] text-slate-450 uppercase mt-0.5 font-semibold">
            Manage your high-stakes deadlines and toggle active execution streams
          </p>
        </div>

        <button
          onClick={() => setIsCreatingNewMission(true)}
          className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-450 hover:to-emerald-350 text-slate-950 font-mono font-bold text-[10px] uppercase rounded-xl shadow-lg shadow-teal-500/10 cursor-pointer flex items-center gap-1.5 transition-all select-none"
        >
          <Plus className="w-3.5 h-3.5 text-slate-950 stroke-[3px]" />
          Plan New Focus Stream
        </button>
      </div>

      {/* Grid of Missions */}
      {missions.length === 0 ? (
        <div className="bg-[#0D1222]/40 border border-slate-900 rounded-2xl p-12 text-center space-y-4 max-w-md mx-auto shadow-xl">
          <Folder className="w-12 h-12 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">No Active Streams</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              You haven't planned any focus streams or study missions yet.
            </p>
          </div>
          <button
            onClick={() => setIsCreatingNewMission(true)}
            className="px-4 py-2 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 hover:border-teal-500 text-teal-400 text-xs font-mono font-bold rounded-xl transition cursor-pointer"
          >
            Plan First Stream Now
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Active & Planned streams */}
          <div className="space-y-4">
            <div className="border-b border-slate-900 pb-2">
              <h3 className="text-xs font-bold font-mono uppercase text-teal-400 tracking-wider flex items-center gap-1.5">
                <span>⚡ Active Execution Streams</span>
                <span className="px-1.5 py-0.2 bg-teal-500/15 text-teal-400 text-[9px] rounded-full font-bold">
                  {missions.filter(m => m.status === 'active' || !m.status).length}
                </span>
              </h3>
            </div>
            
            {missions.filter(m => m.status === 'active' || !m.status).length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">No active execution streams.</p>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {[...missions]
                  .filter(m => m.status === 'active' || !m.status)
                  .sort((a, b) => {
                    const pWeights = { high: 3, medium: 2, low: 1 };
                    const pA = pWeights[a.priority || 'medium'] || 2;
                    const pB = pWeights[b.priority || 'medium'] || 2;
                    if (pA !== pB) return pB - pA; // High priority first
                    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime(); // Then earliest deadline first
                  })
                  .map((m) => {
                  const isActive = m.id === activeMissionId;
                  const completedCount = (m.tasks || []).filter(t => t && t.status === 'completed').length;
                  const totalCount = (m.tasks || []).filter(Boolean).length;
                  const progress = calculateMissionProgress(m);
                  const failureProb = m.failurePrediction?.probability || 0;

                  return (
                    <div 
                      key={m.id}
                      onClick={() => setSelectedMissionId(m.id)}
                      className={`relative bg-[#0D1222]/35 rounded-2xl p-6 border transition-all cursor-pointer hover:bg-slate-900/10 group ${
                        isActive 
                          ? 'border-teal-500/50 shadow-[0_0_20px_rgba(20,184,166,0.1)]' 
                          : 'border-slate-900/80 hover:border-slate-800'
                      }`}
                    >
                      {/* Active stream glow badge */}
                      {isActive && (
                        <span className="absolute -top-2.5 left-6 px-2.5 py-0.5 bg-teal-500 text-slate-950 text-[8px] font-mono font-black uppercase rounded-full shadow-md tracking-wider">
                          🟢 ACTIVE RUNNING CONTEXT
                        </span>
                      )}

                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-extrabold text-white tracking-tight leading-snug flex items-center gap-1.5 group-hover:text-teal-400 transition-colors">
                            <Bookmark className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                            {m.title || 'Untitled Stream'}
                          </h3>
                          <p className="text-xs text-slate-400 font-sans leading-relaxed line-clamp-2">
                            {m.goal}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAskAIAboutStream(m); }}
                            title="Analyze this stream with AI Strategist"
                            className="p-1.5 bg-[#090C15] border border-slate-900 hover:border-teal-500/40 text-slate-400 hover:text-teal-400 rounded-lg transition cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteTrigger(m.id, m.title || m.goal); }}
                            disabled={deletingId === m.id}
                            title="Delete stream"
                            className="p-1.5 bg-[#090C15] border border-slate-900 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer disabled:opacity-40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Badges / Metrics Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-950 my-4 text-xs font-mono font-bold uppercase">
                        <div className="space-y-0.5">
                          <span className="text-[8px] text-slate-500 block">Priority</span>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${getPriorityStyle(m.priority || 'medium')}`}>
                            {m.priority}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[8px] text-slate-500 block">Status</span>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${getStatusStyle(m.status)}`}>
                            {m.status}
                          </span>
                        </div>

                        <div className="space-y-0.5 col-span-2 sm:col-span-2">
                          <span className="text-[8px] text-slate-500 block">Target Deadline</span>
                          <span className="text-slate-300 text-[10px] flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            {formatSafeDate(m.deadline, { dateStyle: 'short', timeStyle: 'short' } as any)}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-450 font-bold uppercase">Task Completion</span>
                          <span className="text-white font-extrabold">{progress}% ({completedCount}/{totalCount})</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                          <div 
                            className="h-full bg-teal-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* AI Diagnostic Block */}
                      <div className="p-3 bg-slate-950/80 border border-slate-900 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[8.5px] font-mono font-bold text-teal-400 tracking-wider uppercase flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-teal-400" /> AI Diagnostic Summary
                          </span>
                          <span className={`text-[8.5px] font-mono font-black uppercase px-1.5 py-0.2 rounded ${
                            failureProb > 60 ? 'bg-rose-500/10 text-rose-400' : failureProb > 30 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            Risk: {failureProb}%
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-[11px] leading-relaxed text-slate-300 font-sans">
                          <p>
                            <strong className="text-slate-400">Bottleneck:</strong>{" "}
                            {m.failurePrediction?.bottleneck || "No bottlenecks predicted. Smooth sailing ahead."}
                          </p>
                        </div>
                      </div>

                      {/* Toggle execution control */}
                      <div className="mt-4 pt-4 border-t border-slate-950 flex justify-between items-center">
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-black">
                          Click card for Deep Diagnostics
                        </span>
                        
                        {isActive ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveTab('mission'); }}
                            className="px-3.5 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 hover:border-teal-400 text-teal-400 text-[10px] font-mono font-bold uppercase rounded-lg transition cursor-pointer flex items-center gap-1"
                          >
                            View Live Board <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMissionId(m.id);
                              useMissionStore.getState().addSystemNotification('Context Switched', `Active stream changed to "${m.title || m.goal}"`, 'info');
                            }}
                            className="px-3.5 py-1.5 bg-[#090C15] hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-mono font-bold uppercase rounded-lg transition cursor-pointer flex items-center gap-1"
                          >
                            Activate Stream
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Historical Streams Archive */}
          <div className="space-y-4 pt-4 border-t border-slate-900/60">
            <div className="pb-2">
              <h3 className="text-xs font-bold font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <span>📚 Historical Streams Archive</span>
                <span className="px-1.5 py-0.2 bg-slate-800 text-slate-400 text-[9px] rounded-full font-bold">
                  {missions.filter(m => m.status === 'completed' || m.status === 'expired').length}
                </span>
              </h3>
            </div>

            {missions.filter(m => m.status === 'completed' || m.status === 'expired').length === 0 ? (
              <p className="text-xs text-slate-500 italic">No archived or completed focus streams yet.</p>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {[...missions]
                  .filter(m => m.status === 'completed' || m.status === 'expired')
                  .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime()) // Newest deadline first
                  .map((m) => {
                  const completedCount = (m.tasks || []).filter(t => t && t.status === 'completed').length;
                  const totalCount = (m.tasks || []).filter(Boolean).length;
                  const progress = calculateMissionProgress(m);
                  const failureProb = m.failurePrediction?.probability || 0;

                  return (
                    <div 
                      key={m.id}
                      onClick={() => setSelectedMissionId(m.id)}
                      className="relative bg-[#0D1222]/15 border border-slate-900/40 hover:border-slate-800 rounded-2xl p-6 transition-all cursor-pointer hover:bg-slate-900/5 group opacity-85 hover:opacity-100"
                    >
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-extrabold text-slate-300 tracking-tight leading-snug flex items-center gap-1.5 group-hover:text-slate-200 transition-colors">
                            <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                            {m.title || 'Untitled Stream'}
                          </h3>
                          <p className="text-xs text-slate-450 font-sans leading-relaxed line-clamp-2">
                            {m.goal}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteTrigger(m.id, m.title || m.goal); }}
                            disabled={deletingId === m.id}
                            title="Delete stream"
                            className="p-1.5 bg-[#090C15] border border-slate-950 hover:border-rose-500/40 text-slate-500 hover:text-rose-400 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Badges / Metrics Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-950/60 my-4 text-xs font-mono uppercase">
                        <div className="space-y-0.5">
                          <span className="text-[8px] text-slate-500 block">Priority</span>
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] ${getPriorityStyle(m.priority || 'medium')}`}>
                            {m.priority}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[8px] text-slate-500 block">Status</span>
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] ${getStatusStyle(m.status)}`}>
                            {m.status}
                          </span>
                        </div>

                        <div className="space-y-0.5 col-span-2 sm:col-span-2">
                          <span className="text-[8px] text-slate-500 block">Target Deadline</span>
                          <span className="text-slate-400 text-[9px] flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-slate-600 shrink-0" />
                            {formatSafeDate(m.deadline, { dateStyle: 'short', timeStyle: 'short' } as any)}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-500 uppercase">Completion Rate</span>
                          <span className="text-slate-300 font-extrabold">{progress}% ({completedCount}/{totalCount})</span>
                        </div>
                        <div className="h-1 w-full bg-slate-950/60 rounded-full overflow-hidden border border-slate-900/40">
                          <div 
                            className="h-full bg-slate-700 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CUSTOM STREAM DELETION CONFIRMATION OVERLAY */}
      {missionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0E0B0C] border border-rose-900/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5"
          >
            <div className="flex items-center gap-2.5 pb-2 border-b border-rose-950">
              <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
              <h3 className="text-xs font-bold font-mono text-rose-400 uppercase tracking-widest">
                DELETION SEQUENCE WARNING
              </h3>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                You are about to permanently purge the Focus Stream:
              </p>
              <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                <span className="text-sm font-extrabold text-rose-300 font-mono block">
                  {missionToDelete.title}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-450 leading-relaxed font-sans">
                This action will completely erase all milestones, priority queues, performance diagnostics, and corresponding Cloud backups. This is irreversible.
              </p>
            </div>

            <div className="flex gap-3 pt-2 font-mono">
              <button
                onClick={() => setMissionToDelete(null)}
                className="flex-1 px-4 py-2 bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-bold uppercase rounded-xl transition hover:border-slate-700 cursor-pointer text-center"
              >
                ABORT DELETION
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-[10px] uppercase rounded-xl shadow-lg shadow-rose-500/10 transition cursor-pointer text-center"
              >
                PROCEED PURGE
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
