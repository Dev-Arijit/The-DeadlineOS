import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Check, 
  MapPin, 
  Tag, 
  Sparkles,
  ArrowUp,
  ArrowDown,
  Maximize2,
  MinusCircle,
  PlusCircle,
  AlertCircle,
  Edit2,
  X,
  FileText
} from 'lucide-react';
import { Mission, Task } from '../types';
import { useMissionStore } from '../store/useMissionStore';

const tzMap: Record<string, string> = {
  'UTC-8': 'America/Los_Angeles',
  'UTC-7': 'America/Denver',
  'UTC-6': 'America/Chicago',
  'UTC-5': 'America/New_York',
  'UTC-0': 'UTC',
  'UTC+5.5': 'Asia/Kolkata',
};

interface CalendarFlowProps {
  activeMission: Mission | null;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onAddTask?: (task: any) => Promise<void>;
}

export function CalendarFlowView({ activeMission, onUpdateTask }: CalendarFlowProps) {
  const [calendarTab, setCalendarTab] = useState<'day' | 'week' | 'month'>('day');
  const userSettings = useMissionStore((state) => state.userSettings);
  const [liveTime, setLiveTime] = useState(new Date());
  
  // Task Editing modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDuration, setEditDuration] = useState(30);
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editScheduledTime, setEditScheduledTime] = useState('');
  const [editStatus, setEditStatus] = useState<'todo' | 'completed'>('todo');
  const [isSaving, setIsSaving] = useState(false);

  // Update live time indicator every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTime(new Date());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // When editing task changes, load values
  useEffect(() => {
    if (editingTask) {
      setEditName(editingTask.name || '');
      setEditDesc(editingTask.description || '');
      setEditDuration(editingTask.durationMinutes || 30);
      setEditPriority(editingTask.priority || 'medium');
      setEditScheduledTime(editingTask.scheduledTime || '');
      setEditStatus(editingTask.status === 'completed' ? 'completed' : 'todo');
    }
  }, [editingTask]);

  if (!activeMission) {
    return (
      <div className="bg-[#0D1222]/40 border border-slate-900 rounded-2xl p-8 text-center space-y-4 max-w-md mx-auto mt-12 shadow-xl">
        <Calendar className="w-12 h-12 text-teal-400 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">No Calendared Workspace</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Please configure or activate a mission on the "My Focus" stream before generating calendar grids.
          </p>
        </div>
      </div>
    );
  }

  // Hours array for Daily scheduler (8 AM to 11 PM)
  const HOURS = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', 
    '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM'
  ];

  const DAYS_OF_WEEK = [
    { name: 'Monday', short: 'Mon' },
    { name: 'Tuesday', short: 'Tue' },
    { name: 'Wednesday', short: 'Wed' },
    { name: 'Thursday', short: 'Thu' },
    { name: 'Friday', short: 'Fri' },
    { name: 'Saturday', short: 'Sat' },
    { name: 'Sunday', short: 'Sun' }
  ];

  // Map task color classifications
  const getTaskColorClass = (task: Task) => {
    if (task.status === 'completed') {
      return 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'; // Green: Completed
    }
    if (task.priority === 'high') {
      return 'bg-rose-500/10 border-rose-500/40 text-rose-400'; // Red: High/Overdue
    }
    if (task.priority === 'medium') {
      return 'bg-amber-500/10 border-amber-500/40 text-amber-400'; // Orange: Upcoming
    }
    // Blue: standard Focus
    return 'bg-teal-500/10 border-teal-500/30 text-teal-400';
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnHour = async (e: React.DragEvent, targetHour: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      await onUpdateTask(taskId, { scheduledTime: targetHour });
    }
  };

  const handleDropOnDay = async (e: React.DragEvent, dayName: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      await onUpdateTask(taskId, { scheduledTime: `Scheduled ${dayName}` });
    }
  };

  // Adjust duration size (e.g. +15m or -15m)
  const adjustTaskDuration = async (e: React.MouseEvent, task: Task, change: number) => {
    e.stopPropagation(); // prevent modal trigger
    const nextDur = Math.max(15, task.durationMinutes + change);
    await onUpdateTask(task.id, { durationMinutes: nextDur });
  };

  // Map tasks into slots for Daily view
  const getTasksForHourSlot = (hour: string) => {
    return activeMission.tasks.filter(t => {
      if (!t.scheduledTime) return false;
      return t.scheduledTime.toUpperCase().trim().includes(hour.toUpperCase().trim());
    });
  };

  const unscheduledTasks = activeMission.tasks.filter(t => !t.scheduledTime);

  // Live indicator vertical position percentage
  const calculateLiveIndicatorOffset = () => {
    const tzName = tzMap[userSettings.timezone] || 'UTC';
    let currentHr = liveTime.getHours();
    let currentMin = liveTime.getMinutes();

    try {
      const formatter = new Intl.DateTimeFormat([], {
        timeZone: tzName,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const formattedParts = formatter.formatToParts(liveTime);
      const hourPart = formattedParts.find(p => p.type === 'hour')?.value;
      const minutePart = formattedParts.find(p => p.type === 'minute')?.value;
      if (hourPart) currentHr = parseInt(hourPart, 10);
      if (minutePart) currentMin = parseInt(minutePart, 10);
    } catch (e) {
      console.warn('DateTimeFormat failed, falling back to local time:', e);
    }
    
    // Scale between 8 AM (8) and 11 PM (23)
    const totalSlots = HOURS.length; // 16 slots
    const startHour = 8;
    const endHour = 23;

    if (currentHr < startHour || currentHr > endHour) return -1; // hide if out of bounds

    const currentOffsetHrs = currentHr - startHour + (currentMin / 60);
    const percent = (currentOffsetHrs / totalSlots) * 100;
    return Math.min(99, Math.max(1, percent));
  };

  const liveOffset = calculateLiveIndicatorOffset();

  const autoSchedule = useMissionStore((state) => state.autoSchedule);

  // Let AI schedule tasks sequentially on the hourly timeline realistically
  const handleAISchedule = async () => {
    if (!activeMission) return;
    await autoSchedule(activeMission.id);
  };

  // Handle saving editing task
  const handleSaveTaskEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    
    setIsSaving(true);
    try {
      await onUpdateTask(editingTask.id, {
        name: editName,
        description: editDesc,
        durationMinutes: Number(editDuration),
        priority: editPriority,
        scheduledTime: editScheduledTime || null,
        status: editStatus
      });
      setEditingTask(null);
    } catch (err) {
      console.error("Failed to update task:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Calendar Switch Controller */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/30 p-4 rounded-2xl border border-slate-900">
        <div>
          <h2 className="text-sm font-bold font-mono uppercase text-white tracking-widest flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-400" />
            STUDY MATRIX CALENDAR
          </h2>
          <p className="text-[10px] text-slate-450 uppercase mt-0.5 font-semibold">
            Active Stream: {activeMission.title || activeMission.goal}
          </p>
        </div>

        {/* View togglers & Auto-Schedule */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleAISchedule}
            className="px-3.5 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-400 text-[10px] font-mono font-bold uppercase rounded-lg transition cursor-pointer flex items-center gap-1.5"
            title="AI automatically distributes tasks realistically into the hourly calendar"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            AI Auto-Schedule
          </button>

          <div className="flex bg-[#090C15] p-1 rounded-xl border border-slate-850">
            {(['day', 'week', 'month'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setCalendarTab(tab)}
                className={`px-3 py-1 text-[9px] font-mono font-bold uppercase rounded-lg transition cursor-pointer select-none ${
                  calendarTab === tab 
                    ? 'bg-teal-500/10 border border-teal-500/20 text-teal-400' 
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                {tab === 'day' ? 'Daily' : tab === 'week' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* DAILY SCHEDULER VIEW */}
      {calendarTab === 'day' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Main 24-Hour Timeline list */}
          <div className="md:col-span-8 bg-[#0D1222]/30 border border-slate-900 rounded-2xl p-6 relative">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-950 mb-4">
              <span className="text-[10px] font-mono font-bold text-slate-450 uppercase tracking-wider">
                Hourly Stream (8:00 AM - 11:00 PM)
              </span>
              <span className="text-[9.5px] font-mono text-teal-400 animate-pulse font-bold">
                ● LIVE TIMELINE INDICATOR
              </span>
            </div>

            {/* Hourly container list */}
            <div className="space-y-0.5 relative pr-2">
              
              {/* Red Live Time moving Indicator */}
              {liveOffset !== -1 && (
                <div 
                  className="absolute left-0 right-0 z-30 flex items-center pointer-events-none transition-all duration-1000"
                  style={{ top: `${liveOffset}%` }}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 shadow-md shadow-rose-500/30" />
                  <div className="h-[1px] bg-rose-500/70 flex-1 ml-1" />
                  <span className="text-[8px] font-mono text-rose-400 font-bold bg-[#090C15] px-1.5 py-0.5 rounded border border-rose-500/20 ml-2">
                    {(() => {
                      const tzName = tzMap[userSettings.timezone] || 'UTC';
                      try {
                        return liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: tzName });
                      } catch (e) {
                        return liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      }
                    })()}
                  </span>
                </div>
              )}

              {HOURS.map((hour) => {
                const hourTasks = getTasksForHourSlot(hour);
                return (
                  <div 
                    key={hour}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnHour(e, hour)}
                    className="flex min-h-[64px] border-b border-slate-950 last:border-b-0 py-2 hover:bg-slate-950/20 transition group relative"
                  >
                    {/* Hour display */}
                    <div className="w-20 pr-4 shrink-0 text-right">
                      <span className="text-[10px] font-mono font-bold text-slate-500 group-hover:text-slate-300 transition block">
                        {hour}
                      </span>
                    </div>

                    {/* Hour contents - Dropped Tasks block */}
                    <div className="flex-1 pl-4 border-l border-slate-950 flex flex-col gap-2 relative">
                      {hourTasks.map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => setEditingTask(task)}
                          className={`p-3 border rounded-xl shadow-md transition-all group/card relative flex justify-between items-center cursor-pointer hover:scale-[1.01] ${getTaskColorClass(task)}`}
                        >
                          <div className="space-y-0.5 min-w-0 pr-10">
                            <h4 className="text-[11px] font-bold truncate leading-snug flex items-center gap-1.5">
                              {task.name}
                              <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover/card:opacity-100 transition" />
                            </h4>
                            <p className="text-[9.5px] opacity-80 leading-normal truncate">{task.description || 'No description'}</p>
                          </div>

                          {/* Quick details & Duration controls (Resizing!) */}
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[9.5px] font-mono font-black">{task.durationMinutes}m</span>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => adjustTaskDuration(e, task, -15)}
                                title="Reduce 15m"
                                className="w-5 h-5 rounded bg-slate-950/40 hover:bg-slate-950 flex items-center justify-center text-[10px] transition cursor-pointer"
                              >
                                -
                              </button>
                              <button
                                onClick={(e) => adjustTaskDuration(e, task, 15)}
                                title="Add 15m"
                                className="w-5 h-5 rounded bg-slate-950/40 hover:bg-slate-950 flex items-center justify-center text-[10px] transition cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {hourTasks.length === 0 && (
                        <div className="h-full flex items-center justify-center">
                          <span className="text-[9px] font-mono text-slate-650 tracking-wider uppercase opacity-0 group-hover:opacity-100 transition">
                            Drop or click to schedule a task here
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

          {/* Right: Unscheduled tasks tray */}
          <div className="md:col-span-4 space-y-4">
            <div className="bg-[#0D1222]/30 border border-slate-900 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="border-b border-slate-950 pb-3 flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-slate-450 uppercase tracking-widest">Unscheduled Tasks</span>
                <span className="text-[9px] font-mono text-teal-400 font-bold bg-teal-950/30 px-2 py-0.5 rounded-full">{unscheduledTasks.length} LEFT</span>
              </div>

              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {unscheduledTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => setEditingTask(task)}
                    className="p-3 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-xl cursor-pointer shadow-md transition group flex flex-col gap-1.5"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-bold text-white group-hover:text-teal-400 transition leading-snug flex items-center gap-1">
                        {task.name}
                        <Edit2 className="w-2.5 h-2.5 text-slate-500 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      </h4>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[8px] font-mono uppercase ${
                        task.priority === 'high' ? 'bg-rose-950/20 text-rose-400' : 'bg-slate-900 text-slate-500'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-450 leading-relaxed truncate">{task.description || 'No description provided.'}</p>
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 font-bold uppercase pt-1 border-t border-slate-900">
                      <span>⌛ {task.durationMinutes}m</span>
                      <span className="text-teal-400 opacity-0 group-hover:opacity-100 transition">DRAG OR CLICK</span>
                    </div>
                  </div>
                ))}

                {unscheduledTasks.length === 0 && (
                  <p className="text-[11px] font-mono text-slate-500 italic py-6 text-center border border-dashed border-slate-900 rounded-xl">
                    All tasks mapped into study timeline slots.
                  </p>
                )}
              </div>
            </div>

            {/* Cognitive Buffer Tips */}
            <div className="bg-[#0E152B] border border-[#1C2C57] rounded-2xl p-5 shadow-lg space-y-2">
              <h4 className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> Cognitive Buffer Tips
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                DRAG blocks to change times, or CLICK any card to edit details directly! Let AI auto-generate your daily flow starting at 09:00 AM with reasonable breaks.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* WEEKLY VIEW */}
      {calendarTab === 'week' && (
        <div className="bg-[#0D1222]/30 border border-slate-900 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-950 mb-2">
            <span className="text-[10px] font-mono font-bold text-slate-450 uppercase tracking-wider">Weekly Sequence Grid (7 Columns)</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Mon-Sun Flow</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
            {DAYS_OF_WEEK.map((day, dIdx) => {
              const dayTasks = activeMission.tasks.filter((_, idx) => idx % 7 === dIdx);
              
              return (
                <div 
                  key={day.name} 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnDay(e, day.name)}
                  className="p-3 bg-slate-950 border border-slate-900/60 rounded-xl flex flex-col gap-2 min-h-[220px]"
                >
                  <div className="pb-2 border-b border-slate-900 text-center">
                    <span className="text-[10px] font-mono font-black text-slate-400 block uppercase">{day.short}</span>
                    <span className="text-[8px] font-mono text-slate-500">Day Vector</span>
                  </div>

                  <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-[280px]">
                    {dayTasks.map((task) => (
                      <div 
                        key={task.id}
                        onClick={() => setEditingTask(task)}
                        className={`p-2 rounded-lg border text-left flex flex-col gap-1 transition cursor-pointer hover:scale-[1.02] ${getTaskColorClass(task)}`}
                      >
                        <h5 className="text-[9.5px] font-black truncate">{task.name}</h5>
                        <div className="flex justify-between items-center text-[8px] font-mono font-bold opacity-70">
                          <span>{task.durationMinutes}m</span>
                          <span>{task.priority.toUpperCase()}</span>
                        </div>
                      </div>
                    ))}

                    {dayTasks.length === 0 && (
                      <div className="flex-grow flex items-center justify-center border border-dashed border-slate-900 rounded-lg py-8">
                        <span className="text-[8px] font-mono text-slate-650 text-center">Free Time</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MONTHLY VIEW */}
      {calendarTab === 'month' && (
        <div className="bg-[#0D1222]/30 border border-slate-900 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-950 mb-2">
            <span className="text-[10px] font-mono font-bold text-slate-450 uppercase tracking-wider">MONTHLY MILESTONES VIEW</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">35-Cell Matrix</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px] font-bold text-slate-500 pb-2 border-b border-slate-950 uppercase">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, idx) => {
              const dayNum = (idx + 1) % 30 || 30;
              const hasMilestone = idx === 11 || idx === 25;
              const hasTask = idx % 4 === 1;
              const isToday = idx === 17;

              let cellBg = 'bg-slate-950/40 border-slate-900/30';
              if (isToday) {
                cellBg = 'bg-teal-950/20 border-teal-500/30';
              }

              return (
                <div 
                  key={idx}
                  className={`min-h-[64px] border rounded-xl p-2 flex flex-col justify-between transition hover:bg-slate-950 ${cellBg}`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-mono font-black ${isToday ? 'text-teal-400' : 'text-slate-500'}`}>{dayNum}</span>
                    {isToday && <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />}
                  </div>

                  <div className="space-y-1">
                    {hasMilestone && (
                      <div className="px-1 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-[7.5px] font-mono font-bold text-purple-400 uppercase truncate">
                        Milestone 🎯
                      </div>
                    )}
                    {hasTask && (
                      <div className="px-1 py-0.5 bg-teal-500/15 border border-teal-500/20 rounded text-[7.5px] font-mono font-bold text-teal-300 uppercase truncate">
                        {idx % 3 === 0 ? 'Completed' : 'Upcoming'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-950 flex flex-wrap gap-4 text-[9px] font-mono font-black uppercase text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-teal-500/20 border border-teal-500/40" /> Blue (Focus)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/40" /> Green (Completed)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/40" /> Orange (Upcoming)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500/40" /> Red (Overdue)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-purple-500/20 border border-purple-500/40" /> Purple (Exam / Milestone)</span>
          </div>
        </div>
      )}

      {/* TASK EDITING MODAL OVERLAY */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0D1222] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 animate-fade-in">
            
            <button 
              onClick={() => setEditingTask(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 pb-2 border-b border-slate-950">
              <FileText className="w-4 h-4 text-teal-400" />
              <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                Manage Focus Task
              </h3>
            </div>

            <form onSubmit={handleSaveTaskEdit} className="space-y-4">
              {/* Task Title */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-slate-450 uppercase block">
                  Task Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-teal-500 transition-all"
                  placeholder="Task Name"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-slate-450 uppercase block">
                  Details / Notes
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 text-xs text-white rounded-lg p-2.5 h-20 focus:outline-none focus:border-teal-500 transition-all resize-none"
                  placeholder="Notes or execution steps..."
                />
              </div>

              {/* Duration & Priority Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono font-bold text-slate-450 uppercase block">
                    Duration (Minutes)
                  </label>
                  <select
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-teal-500 transition"
                  >
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono font-bold text-slate-450 uppercase block">
                    Priority
                  </label>
                  <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-850">
                    {(['low', 'medium', 'high'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditPriority(p)}
                        className={`flex-1 py-1.5 text-[9px] font-mono font-bold uppercase rounded transition cursor-pointer select-none ${
                          editPriority === p
                            ? p === 'high' ? 'bg-rose-500/20 text-rose-400' : p === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-teal-500/20 text-teal-400'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Time Slot Selector */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-slate-450 uppercase block">
                  Calendar Slot
                </label>
                <select
                  value={editScheduledTime}
                  onChange={(e) => setEditScheduledTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-teal-500 transition-all font-mono"
                >
                  <option value="">Unscheduled (Standby list)</option>
                  {HOURS.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d.name} value={`Scheduled ${d.name}`}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Selector */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-slate-450 uppercase block">
                  Status
                </label>
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-850">
                  <button
                    type="button"
                    onClick={() => setEditStatus('todo')}
                    className={`flex-1 py-1.5 text-[9px] font-mono font-bold uppercase rounded transition cursor-pointer select-none ${
                      editStatus === 'todo'
                        ? 'bg-teal-500/10 border border-teal-500/20 text-teal-400'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    In Progress / Todo
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('completed')}
                    className={`flex-1 py-1.5 text-[9px] font-mono font-bold uppercase rounded transition cursor-pointer select-none ${
                      editStatus === 'completed'
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Completed
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-950 flex justify-end gap-3 font-mono">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 bg-[#090C15] border border-slate-850 hover:border-slate-700 text-xs text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-450 hover:to-emerald-350 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Apply Schedule'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
