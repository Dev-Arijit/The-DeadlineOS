import React, { useState } from 'react';
import { SmartNotification } from '../types';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  AlertTriangle, 
  Award, 
  Lightbulb, 
  Info, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationCenterViewProps {
  notifications: SmartNotification[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onToggleRead: (id: string) => void;
}

export function NotificationCenterView({ 
  notifications, 
  onMarkAllAsRead, 
  onClearAll, 
  onToggleRead 
}: NotificationCenterViewProps) {
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const getAlertIcon = (type: SmartNotification['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-rose-455 shrink-0" />;
      case 'tip':
        return <Lightbulb className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'success':
        return <Award className="w-5 h-5 text-emerald-400 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-teal-400 shrink-0" />;
    }
  };

  const getAlertStyle = (type: SmartNotification['type']) => {
    switch (type) {
      case 'warning':
        return 'border-rose-950/20 bg-rose-950/5 hover:border-rose-900/40';
      case 'tip':
        return 'border-amber-955/20 bg-amber-955/5 hover:border-amber-500/40';
      case 'success':
        return 'border-emerald-950/20 bg-emerald-950/5 hover:border-emerald-500/40';
      default:
        return 'border-slate-900 bg-slate-950/40 hover:border-slate-850';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 relative">
            <Bell className="w-5 h-5 animate-pulse" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-rose-500 rounded-full border-2 border-slate-950 text-[9px] font-bold text-white flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Smart Agent Notification Center</h2>
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">{notifications.length} ALERT ARCHIVES IN MEMORY</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {notifications.length > 0 && (
            <>
              <button
                onClick={onMarkAllAsRead}
                className="px-3 py-2 sm:py-1.5 bg-slate-950/60 hover:bg-slate-950 text-teal-400 hover:text-white border border-slate-850 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                MARK ALL READ
              </button>
              <button
                onClick={onClearAll}
                className="px-3 py-2 sm:py-1.5 bg-slate-950/60 hover:bg-slate-950 text-slate-400 hover:text-white border border-slate-850 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                CLEAR ALL
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {notifications && notifications.length > 0 ? (
            notifications.map((notif) => (
              <motion.div
                key={notif.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-4 rounded-xl border transition flex gap-3.5 items-start justify-between relative group ${getAlertStyle(notif.type)} ${
                  !notif.read ? 'ring-1 ring-teal-500/10' : ''
                }`}
              >
                <div className="flex gap-3 items-start flex-grow">
                  {getAlertIcon(notif.type)}
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-xs font-bold leading-none ${notif.read ? 'text-slate-400 font-medium' : 'text-white font-bold'}`}>
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-[8px] font-mono font-bold text-teal-400 uppercase tracking-widest animate-pulse leading-none">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed font-sans ${notif.read ? 'text-slate-500' : 'text-slate-300'}`}>
                      {notif.content}
                    </p>
                    <span className="block text-[10px] font-mono text-slate-600">
                      {notif.timestamp || 'Coach Agent • Just now'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onToggleRead(notif.id)}
                  className="px-3 py-2 sm:py-1 sm:px-1.5 min-h-[44px] sm:min-h-0 text-[9px] font-mono tracking-widest cursor-pointer opacity-90 group-hover:opacity-100 transition shrink-0 bg-slate-950/40 hover:bg-slate-950 text-slate-400 hover:text-white border border-slate-900 sm:border-transparent hover:border-slate-800 rounded flex items-center justify-center"
                >
                  {notif.read ? 'MARK UNREAD' : 'DISMISS / READ'}
                </button>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 p-6 rounded-2xl border border-slate-900 bg-slate-900/30 font-mono text-xs text-slate-500 space-y-2"
            >
              <CheckCircle className="w-10 h-10 text-slate-700 mx-auto animate-pulse" />
              <div>Synchronized comfort. No warning alerts on this active terminal buffer.</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
