import React from 'react';
import { Mission, Decision } from '../types';
import { 
  Bot, 
  Layers, 
  TrendingUp, 
  ShieldAlert, 
  RotateCcw, 
  Volume2, 
  Clock, 
  Sparkles,
  Activity,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';

interface AgentCenterViewProps {
  mission: Mission;
}

export function AgentCenterView({ mission }: AgentCenterViewProps) {
  const { decisionLog, failurePrediction, confidenceScore } = mission;

  // Premium, human-readable details about our co-operating AI agents
  const agents = [
    {
      id: 'Planner',
      name: 'Planner Agent',
      icon: Layers,
      color: 'text-teal-400 border-teal-500/10 bg-teal-500/5',
      badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      role: 'Break goals down into step-by-step milestones',
      defaultThoughts: 'Milestones mapped relative to your target schedule. Sprints are structured for maximum velocity.'
    },
    {
      id: 'Priority',
      name: 'Priority Agent',
      icon: TrendingUp,
      color: 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      role: 'Evaluate dependencies and order core paths',
      defaultThoughts: 'Critical dependencies locked. Recommended tasks are prioritized based on sequential urgency.'
    },
    {
      id: 'Risk',
      name: 'Risk Agent',
      icon: ShieldAlert,
      color: 'text-rose-400 border-rose-500/10 bg-rose-500/5',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      role: 'Predict missed deadlines and workload bottlenecks',
      defaultThoughts: `Borders monitored. Calculated risk model is actively updated at ${failurePrediction?.probability || 15}% deviation rate.`
    },
    {
      id: 'Replanner',
      name: 'Replanner Agent',
      icon: RotateCcw,
      color: 'text-amber-400 border-amber-500/10 bg-amber-500/5',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      role: 'Defer scope and adjust schedules dynamically',
      defaultThoughts: 'Listening for task states. Ready to instantly trigger automatic contingency plans.'
    },
    {
      id: 'Coach',
      name: 'Coach Agent',
      icon: Volume2,
      color: 'text-indigo-400 border-indigo-505/10 bg-indigo-505/5',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      role: 'Generate direct, actionable success prompts',
      defaultThoughts: 'Active advice buffer ready. Providing positive focus advice for active execution.'
    }
  ];

  // Extracts the last decision of a specific agent from the live decision log
  const getLatestAgentDecision = (agentId: string): Decision | null => {
    if (!decisionLog || decisionLog.length === 0) return null;
    const items = [...decisionLog]
      .filter(d => d.agent.toLowerCase() === agentId.toLowerCase());
    return items[0] || null; 
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Intro Header Section */}
      <div className="p-6 md:p-8 rounded-3xl border border-slate-900 bg-gradient-to-br from-slate-900/50 to-slate-950 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 font-mono text-[10px] text-slate-600 uppercase tracking-widest hidden sm:block">
          Cooperative AI Orchestration
        </div>
        
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex gap-1.5 items-center px-2.5 py-1 rounded bg-teal-500/10 border border-teal-500/20 text-[10px] font-mono text-teal-400 font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-teal-400" />
            AI Agent Syndicate
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
            Meet your cooperative planning team
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed font-sans">
            Your goals are managed by five expert AI agents working in harmony. Each agent monitors a dedicated aspect of your plan—adjusting scope, predicting risks, and rearranging timelines to guarantee a successful finish before your deadline.
          </p>
        </div>
      </div>

      {/* Agents Control Interface list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {agents.map((ag) => {
          const latestDecision = getLatestAgentDecision(ag.id);
          const AgentIcon = ag.icon;
          
          return (
            <div 
              key={ag.id} 
              className="p-6 bg-slate-900/20 hover:bg-slate-900/40 border border-slate-900/80 hover:border-slate-800 rounded-3xl transition duration-300 flex flex-col justify-between space-y-5 shadow-lg group"
            >
              <div className="space-y-4">
                {/* Agent Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl border flex items-center justify-center ${ag.color} group-hover:scale-105 transition duration-200`}>
                      <AgentIcon className="w-5 h-5 shrink-0" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-snug group-hover:text-teal-400 transition">{ag.name}</h3>
                      <span className="text-xs text-slate-400 leading-none block mt-1">{ag.role}</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 border text-[9px] font-mono tracking-wider font-bold rounded-full flex items-center gap-1.5 leading-none bg-emerald-500/10 text-emerald-400 border-emerald-500/20`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ACTIVE
                  </span>
                </div>

                {/* Status, Last Action, Reasoning & Timestamp cards */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-900 space-y-3.5">
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-900/50">
                    <span>STATUS</span>
                    <span className="text-emerald-430 font-bold">READY</span>
                  </div>

                  {latestDecision ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">LAST ACTION</div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
                          {latestDecision.action}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">REASONING & DECISION</div>
                        <p className="text-xs text-slate-400 leading-relaxed font-sans font-medium">
                          "{latestDecision.reasoning}"
                        </p>
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 pt-1">
                        <span>TIMESTAMP</span>
                        <span>{latestDecision.timestamp || 'Just now'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <div className="text-[10px] font-mono text-slate-500 tracking-wider mb-1">STANDBY THOUGHTS</div>
                        <p className="text-xs italic text-slate-400 font-sans leading-relaxed">
                          "{ag.defaultThoughts}"
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 pt-1">
                        <span>CURRENT SPEED</span>
                        <span>NOMINAL</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Decision Log Tracker (Audit trail) - beautifully designed */}
      <div className="p-6 rounded-3xl border border-slate-900 bg-slate-900/20 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-900 pb-4 gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider">Syndicate Decision Log</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Chronological Audit Log</span>
        </div>

        <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
          {decisionLog && decisionLog.length > 0 ? (
            decisionLog.map((dec, i) => (
              <div 
                key={dec.id || i} 
                className="p-4 bg-slate-950/40 border border-slate-900/60 hover:border-slate-800 rounded-2xl transition duration-200 text-xs flex flex-col md:flex-row md:items-start gap-4 justify-between"
              >
                <div className="space-y-1.5 flex-grow">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-555/20 text-[9px] font-mono font-bold text-teal-400 uppercase tracking-widest leading-none">
                      {dec.agent} Agent
                    </span>
                    <span className="text-xs font-bold text-white">{dec.action}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">{dec.reasoning}</p>
                </div>
                <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 shrink-0 select-none">
                  <Clock className="w-3 h-3" />
                  <span>{dec.timestamp || 'Just now'}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 bg-slate-950/20 rounded-2xl border border-dashed border-slate-900 text-xs text-slate-500 font-mono font-semibold">
              No actions have been logged yet. Check back once you update task statuses.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
