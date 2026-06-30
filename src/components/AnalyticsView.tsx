import React from 'react';
import { Mission, Task } from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Activity, 
  Timer, 
  PieChart, 
  ListCheck,
  Zap,
  HelpCircle
} from 'lucide-react';
import { motion } from 'motion/react';

interface AnalyticsViewProps {
  mission: Mission | null;
}

export function AnalyticsView({ mission }: AnalyticsViewProps) {
  if (!mission) {
    return (
      <div className="text-center py-16 p-6 rounded-2xl border border-slate-900 bg-slate-900/30 font-mono text-xs text-slate-500 space-y-2">
        <PieChart className="w-10 h-10 text-slate-700 mx-auto animate-pulse" />
        <div>Establish an active mission blueprint to unlock complete velocity index dashboards.</div>
      </div>
    );
  }

  const { tasks, confidenceScore, failurePrediction } = mission;

  // Analytical stats
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.status === 'completed') || [];
  const skippedTasks = tasks?.filter(t => t.status === 'skipped') || [];
  const todoTasks = tasks?.filter(t => t.status === 'todo') || [];

  const completionRatio = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  
  // Calculate approximate total elapsed minutes
  const totalCompletedMinutes = completedTasks.reduce((sum, t) => sum + t.durationMinutes, 0);
  const totalPendingMinutes = todoTasks.reduce((sum, t) => sum + t.durationMinutes, 0);

  const formatMinutes = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-6">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl border border-slate-905 bg-slate-900/40 backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">COMPLETION STATUS</span>
            <span className="text-2xl font-black text-white block font-sans tracking-tight">{completionRatio}%</span>
            <span className="block text-[10px] font-mono text-slate-600 font-semibold">{completedTasks.length} OF {totalTasks} TASKS CLEAR</span>
          </div>
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <CheckCircle className="w-5 h-5 shrink-0 animate-pulse" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl border border-slate-905 bg-slate-900/40 backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">RESOLVED RUN-TIME</span>
            <span className="text-2xl font-black text-white block font-sans tracking-tight">{formatMinutes(totalCompletedMinutes)}</span>
            <span className="block text-[10px] font-mono text-slate-600 font-semibold">FOCUSED VELOCITY DISPATCHED</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Timer className="w-5 h-5 shrink-0" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl border border-slate-905 bg-slate-900/40 backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">QUEUED ESTIMATE</span>
            <span className="text-2xl font-black text-white block font-sans tracking-tight">{formatMinutes(totalPendingMinutes)}</span>
            <span className="block text-[10px] font-mono text-slate-600 font-semibold">{todoTasks.length} SEQUENTIAL WORK ITEMS QUEUED</span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Clock className="w-5 h-5 shrink-0" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl border border-slate-905 bg-slate-900/40 backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">CRITICAL BLOCKERS</span>
            <span className="text-2xl font-black text-white block font-sans tracking-tight">
              {tasks?.filter(t => t.priority === 'high' && t.status === 'todo').length || 0}
            </span>
            <span className="block text-[10px] font-mono text-rose-500 font-semibold font-bold">HIGH RISK TASKS IN BACKLOG</span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-405">
            <AlertTriangle className="w-5 h-5 shrink-0" />
          </div>
        </div>
      </div>

      {/* Grid: Productivity Graph & Tasks Status Breakdown List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Visual Priority Graph using styled bar segments */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">CRITICAL CAPACITY WORKLOAD DISTRIBUTION</h3>
          </div>

          <p className="text-xs text-slate-440 pb-2">
            Estimated duration minutes categorized by prioritize weight metrics. Prioritizing critical server architectures ensures safety margin clearance.
          </p>

          <div className="space-y-4">
            {[
              { 
                label: '🔥 High Priority Items', 
                minutes: tasks?.filter(t => t.priority === 'high').reduce((sum, t) => sum + t.durationMinutes, 0) || 0,
                color: 'bg-rose-500',
                text: 'text-rose-400'
              },
              { 
                label: '⚡ Medium Priority Items', 
                minutes: tasks?.filter(t => t.priority === 'medium').reduce((sum, t) => sum + t.durationMinutes, 0) || 0,
                color: 'bg-teal-500',
                text: 'text-teal-400'
              },
              { 
                label: '🔋 Low Priority / Scope creep', 
                minutes: tasks?.filter(t => t.priority === 'low').reduce((sum, t) => sum + t.durationMinutes, 0) || 0,
                color: 'bg-indigo-550',
                text: 'text-indigo-400'
              }
            ].map((dist, i) => {
              const maxMinutes = Math.max(1, tasks?.reduce((sum, t) => sum + t.durationMinutes, 0) || 1);
              const percentage = Math.round((dist.minutes / maxMinutes) * 100);
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-300 font-semibold">{dist.label}</span>
                    <span className={`${dist.text} font-bold`}>{formatMinutes(dist.minutes)} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-900">
                    <div 
                      style={{ width: `${percentage}%` }} 
                      className={`h-full ${dist.color}`} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Completion Ratios Ledger */}
        <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-md space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ListCheck className="w-4 h-4 text-teal-400" />
              <h3 className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">LEDGER STATE SUMMARY</h3>
            </div>
            
            <div className="space-y-2.5 text-xs text-slate-350 pt-2 border-t border-slate-950">
              <div className="flex justify-between font-mono">
                <span>TOTAL MISSION TASKS:</span>
                <span className="text-white font-bold">{totalTasks}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>COMPLETED PIPELINES:</span>
                <span className="text-emerald-450 font-bold">{completedTasks.length}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>DEFERRED CHIPS:</span>
                <span className="text-amber-400 font-bold">{skippedTasks.length}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>ACTIVE STACK:</span>
                <span className="text-teal-400 font-bold">{todoTasks.length}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-950 font-mono text-[10px] text-slate-500 leading-snug">
            Weekly analytics recalculate index parameters automatically post task status update events.
          </div>
        </div>

      </div>

    </div>
  );
}
