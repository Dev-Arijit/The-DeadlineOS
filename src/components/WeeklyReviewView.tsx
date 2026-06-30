import React from 'react';
import { Mission, Task } from '../types';
import { 
  Award, 
  XOctagon, 
  TrendingUp, 
  Zap, 
  Clock, 
  HelpCircle, 
  Sparkles, 
  CheckCircle, 
  Compass,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';

interface WeeklyReviewViewProps {
  mission: Mission | null;
}

export function WeeklyReviewView({ mission }: WeeklyReviewViewProps) {
  if (!mission) {
    return (
      <div className="text-center py-16 p-6 rounded-2xl border border-slate-900 bg-slate-900/30 font-mono text-xs text-slate-500 space-y-2">
        <Sparkles className="w-10 h-10 text-slate-700 mx-auto animate-pulse" />
        <div>Establish an active mission blueprint to activate retrospective compilation filters.</div>
      </div>
    );
  }

  const { tasks, confidenceScore, failurePrediction } = mission;

  // Compute stats
  const completedTasks = tasks?.filter(t => t.status === 'completed') || [];
  const skippedTasks = tasks?.filter(t => t.status === 'skipped') || [];
  const todoTasks = tasks?.filter(t => t.status === 'todo') || [];

  const highPriorityCompleted = completedTasks.filter(t => t.priority === 'high');

  // AI recommendations based on state
  const getAIRecommendations = () => {
    if (skippedTasks.length > 0) {
      return `Prioritizing mitigation. Replanner deferred ${skippedTasks.length} low-stakes items. Your current success probability is calibrated at ${100 - (failurePrediction?.probability || 25)}% - execute high-priority objectives immediately to maintain acceleration.`;
    }
    if (completedTasks.length > 5) {
      return "Pristine momentum detected. Cognitive stress density is low. The risk agent predicts near-zero chance of delay. Continue advancing on standard schedulers.";
    }
    return "Initial sprint underway. Refrain from modifying task sequences manually unless critical. Ensure database migrations occur prior to frontend client work for maximum speed.";
  };

  return (
    <div className="space-y-6">
      
      {/* Intro Recap Title */}
      <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 font-mono text-[10px] text-slate-750 select-none">
          SYS_REPORT::RETRO_V1
        </div>
        
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex gap-1.5 items-center px-2.5 py-1 rounded bg-teal-500/10 border border-teal-500/25 text-[10px] font-mono text-teal-400 font-bold uppercase tracking-widest leading-none">
            <Award className="w-3.5 h-3.5" />
            WEEKLY VELOCITY REVIEW
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Piloting Performance & AI Recommendations
          </h2>
          <p className="text-xs text-slate-405 leading-relaxed">
            Consolidated retrospective analysis highlighting executed breakthroughs, abandoned scopes, and custom coach guidelines designed specifically to preserve deadlines.
          </p>
        </div>
      </div>

      {/* Wins vs Misses splits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Completed wins block */}
        <div className="p-5 rounded-2xl border border-emerald-500/10 bg-emerald-950/5 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              PILOTING WINS & MILESTONES
            </span>
            <span className="text-[10px] font-mono text-slate-500">{completedTasks.length} COMPLETED</span>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
            {completedTasks.length > 0 ? (
              completedTasks.map((t) => (
                <div key={t.id} className="p-3 bg-slate-950/65 border border-slate-900 rounded-xl flex items-center justify-between text-xs gap-3">
                  <div className="truncate">
                    <strong className="text-white block truncate">{t.name}</strong>
                    <span className="text-[10px] font-mono text-slate-505">Priority: {t.priority.toUpperCase()}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono text-emerald-400 font-bold shrink-0">
                    RESOLVED
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-500 font-mono italic">
                No tasks resolved on this active cycle.
              </div>
            )}
          </div>
        </div>

        {/* Skipped / Deferred misses block */}
        <div className="p-5 rounded-2xl border border-rose-500/10 bg-rose-950/5 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <span className="text-xs font-mono text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <XOctagon className="w-4 h-4" />
              DEFERRED & SKIPPED PROTOCOLS
            </span>
            <span className="text-[10px] font-mono text-slate-505">{skippedTasks.length} SHIFTED</span>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
            {skippedTasks.length > 0 ? (
              skippedTasks.map((t) => (
                <div key={t.id} className="p-3 bg-slate-950/65 border border-slate-900 rounded-xl flex items-center justify-between text-xs gap-3">
                  <div className="truncate">
                    <strong className="text-white block truncate">{t.name}</strong>
                    <span className="text-[10px] font-mono text-slate-500">Scheduled: {t.scheduledTime}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-mono text-amber-400 font-bold shrink-0">
                    DEFERRED
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-500 font-mono italic">
                Clean ledger! No objectives bypassed or deferred.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Productivity Trends & Working Hours */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Core trends statistics */}
        <div className="p-5 bg-slate-900/40 border border-slate-900 rounded-2xl md:col-span-1 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">PRODUCTIVITY METRICS</h3>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-900">
              <span className="block text-[10px] font-mono text-slate-550 uppercase">Velocity index</span>
              <div className="text-xl font-bold text-white flex items-baseline gap-1.5 mt-1">
                +18.4%
                <span className="text-[9px] font-mono text-emerald-400">FASTER EXPECTED</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-900">
              <span className="block text-[10px] font-mono text-slate-550 uppercase">Task completion rate</span>
              <div className="text-xl font-bold text-white mt-1">
                {Math.round(((completedTasks.length) / (tasks?.length || 1)) * 100)}%
              </div>
            </div>
          </div>
        </div>

        {/* Best working hours visual representation */}
        <div className="p-5 bg-slate-900/40 border border-slate-900 rounded-2xl md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">RECOMMENDED PEAK COGNITIVE HOURS</h3>
          </div>

          <p className="text-xs text-slate-400 leading-normal">
            Based on completed subtasks, your high-impact deliverables cluster specifically within early morning focus sectors.
          </p>

          <div className="grid grid-cols-4 gap-2 pt-3">
            {[
              { label: 'MORNING', score: 92, active: true },
              { label: 'AFTERNOON', score: 45, active: false },
              { label: 'EVENING', score: 70, active: false },
              { label: 'MIDNIGHT', score: 15, active: false }
            ].map((hr, idx) => (
              <div key={idx} className="p-2.5 bg-slate-950 rounded-xl border border-slate-900 flex flex-col justify-between h-24">
                <span className="text-[9px] font-mono text-slate-500 font-bold">{hr.label}</span>
                <div className="space-y-1">
                  <div className="w-full bg-slate-905 h-1.5 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${hr.score}%` }} 
                      className={`h-full ${hr.active ? 'bg-teal-400' : 'bg-slate-700'}`} 
                    />
                  </div>
                  <span className={`text-[10px] font-mono font-bold block ${hr.active ? 'text-teal-400' : 'text-slate-400'}`}>
                    {hr.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Recommendation Box */}
      <div className="p-5 rounded-2xl border border-teal-500/20 bg-teal-950/15 backdrop-blur-md flex gap-4 items-start">
        <Sparkles className="w-5 h-5 text-teal-400 shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-1.5 text-xs">
          <h4 className="font-bold font-mono text-[10px] text-teal-400 uppercase tracking-widest leading-none">COACH BOTTLENECK SYNTHESIS ACTION</h4>
          <p className="text-slate-300 leading-relaxed font-sans">
            "{getAIRecommendations()}"
          </p>
        </div>
      </div>

    </div>
  );
}
