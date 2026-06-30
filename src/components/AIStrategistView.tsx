import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  Mic, 
  MicOff, 
  Send, 
  CornerDownLeft, 
  Cpu, 
  HelpCircle, 
  ListRestart, 
  Zap, 
  Scale, 
  AlertOctagon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Mission } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface AIStrategistViewProps {
  chatHistory: ChatMessage[];
  chatLoading: boolean;
  onSendMessage: (msgText: string) => Promise<void>;
  activeMission: Mission | null;
  user: any;
}

export function AIStrategistView({ 
  chatHistory, 
  chatLoading, 
  onSendMessage, 
  activeMission,
  user
}: AIStrategistViewProps) {
  const [inputVal, setInputVal] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const containerEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    containerEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || chatLoading) return;
    onSendMessage(inputVal);
    setInputVal('');
  };

  const triggerQuickAction = (promptText: string) => {
    if (chatLoading) return;
    onSendMessage(promptText);
  };

  const toggleReasoning = (msgId: string) => {
    setExpandedReasoning(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Helper to parse message and isolate reasoning lists or details from actionable directives
  const renderParsedMessage = (msg: ChatMessage) => {
    const text = msg.text;
    
    // Check if message is the welcome message or a short model reply
    if (msg.role === 'user') {
      return (
        <p className="text-sm font-medium text-slate-100 font-sans leading-relaxed">
          {text}
        </p>
      );
    }

    // Attempt to split AI replies into: "Direct Action Core" and "Underlying Analysis / Reasoning"
    const lowerText = text.toLowerCase();
    let mainBody = text;
    let reasoningBlock = '';

    // If text contains reasoning/analysis labels, split them
    if (text.includes("### Reasoning") || text.includes("Reasoning:")) {
      const parts = text.split(/### Reasoning|Reasoning:/gi);
      mainBody = parts[0].trim();
      reasoningBlock = parts[1]?.trim() || '';
    } else if (text.includes("\n\n*")) {
      // split on bullet points if there's a long block
      const lastParagraphIdx = text.lastIndexOf("\n\n");
      if (lastParagraphIdx > 40) {
        mainBody = text.substring(0, lastParagraphIdx).trim();
        reasoningBlock = text.substring(lastParagraphIdx).trim();
      }
    }

    const showReasoning = expandedReasoning[msg.id] ?? false;

    return (
      <div className="space-y-3 font-sans">
        
        {/* Main directives / Action steps */}
        <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line prose prose-invert">
          {mainBody}
        </div>

        {/* Actionable reasoning collapsible cards (Requested item!) */}
        {reasoningBlock && (
          <div className="border border-slate-900 bg-slate-950/45 rounded-xl overflow-hidden mt-2">
            <button
              onClick={() => toggleReasoning(msg.id)}
              className="w-full px-3 py-2 bg-slate-950 flex justify-between items-center text-[10px] font-mono font-bold text-slate-450 hover:text-white transition cursor-pointer select-none"
            >
              <span className="flex items-center gap-1.5 uppercase">
                <Cpu className="w-3.5 h-3.5 text-teal-400" />
                Underlying AI Decision Logs ({showReasoning ? 'OPEN' : 'COLLAPSED'})
              </span>
              {showReasoning ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showReasoning && (
              <div className="p-3 text-[10.5px] text-slate-400 font-sans leading-relaxed whitespace-pre-line border-t border-slate-950 animate-slide-down">
                {reasoningBlock}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const suggestedPrompts = [
    { label: "What should I do next?", icon: Sparkles, text: "What is my absolute highest priority next task based on risk factors?" },
    { label: "Can I finish today?", icon: Zap, text: "Can I realistically complete the remaining tasks in my schedule today?" },
    { label: "Replan my day", icon: ListRestart, text: "I fell behind on my focus timeline. Please compress and replan my schedule." },
    { label: "Reduce workload", icon: Scale, text: "I am feeling extremely overwhelmed. Suggest non-critical tasks to skip/remove." },
    { label: "Generate study plan", icon: Cpu, text: "Create an intense step-by-step cognitive study plan to maximize my grade." },
    { label: "Help me focus", icon: HelpCircle, text: "Give me some stress-free cognitive coaching to beat procrastination right now." }
  ];

  return (
    <div className="flex flex-col h-[750px] max-h-[85vh] bg-[#0D1222]/40 rounded-2xl border border-slate-900 overflow-hidden shadow-2xl relative">
      
      {/* Top Strategist Status */}
      <div className="px-5 py-4 bg-[#0D1222] border-b border-slate-950 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/10">
              <Sparkles className="w-4 h-4 fill-slate-950" />
            </div>
            <span className="absolute bottom-[-1px] right-[-1px] w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0D1222]" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white">AI COACH INTEL SYSTEM</h3>
            <p className="text-[10px] text-slate-400 font-medium">Equipped with Gemini 3.5 High-Context Model</p>
          </div>
        </div>

        {activeMission && (
          <div className="hidden sm:block text-right">
            <span className="text-[9px] font-mono text-slate-500 uppercase block">ACTIVE WORKSTREAM TARGET</span>
            <span className="text-[11px] font-bold text-teal-400 truncate max-w-[180px] block">{activeMission.title || activeMission.goal}</span>
          </div>
        )}
      </div>

      {/* Suggested Prompts Shelf (Requested Item!) */}
      <div className="px-5 py-3.5 bg-[#090C15] border-b border-slate-950 shrink-0 overflow-x-auto flex gap-2 scrollbar-none">
        {suggestedPrompts.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => triggerQuickAction(item.text)}
              disabled={chatLoading}
              className="px-3 py-1.5 bg-[#0D1222] hover:bg-[#151B30] border border-slate-900 rounded-xl text-[10px] font-bold text-slate-300 hover:text-white transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer disabled:opacity-50 select-none"
            >
              <Icon className="w-3.5 h-3.5 text-teal-400" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Main Chats Container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#090C15]/40">
        {chatHistory.map((msg) => {
          const isModel = msg.role === 'model';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 w-full ${isModel ? 'justify-start' : 'justify-end flex-row-reverse'}`}
            >
              {/* Avatar Icon */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-md ${
                isModel 
                  ? 'bg-teal-950/20 border-teal-550/30 text-teal-400' 
                  : 'bg-slate-900 border-slate-800 text-white'
              }`}>
                {isModel ? <Sparkles className="w-4 h-4 fill-teal-500/10" /> : <Mic className="w-4 h-4 text-slate-300" />}
              </div>

              {/* Message Bubble wrapper */}
              <div className={`rounded-2xl p-4 shadow-xl border max-w-[85%] ${
                isModel 
                  ? 'bg-[#0D1222]/85 border-slate-900 rounded-tl-sm' 
                  : 'bg-teal-600/10 border-teal-500/20 rounded-tr-sm'
              }`}>
                {renderParsedMessage(msg)}
                <div className="text-[8.5px] font-mono text-slate-600 text-right mt-1.5 select-none uppercase">
                  {isModel ? 'AI Coach' : 'User Focus'}
                </div>
              </div>

            </div>
          );
        })}

        {/* AI Typing / thinking indicator (Requested item!) */}
        {chatLoading && (
          <div className="flex gap-3 max-w-lg">
            <div className="w-8 h-8 rounded-lg bg-teal-950/20 border border-teal-550/30 flex items-center justify-center text-teal-400">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-[#0D1222]/85 border border-slate-900 rounded-2xl rounded-tl-sm p-4 space-y-2 w-48">
              <div className="flex gap-1.5 items-center justify-start py-1">
                <span className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-bounce duration-500" />
                <span className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-bounce duration-750" />
                <span className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-bounce duration-1000" />
              </div>
              <p className="text-[9px] font-mono text-slate-500 uppercase font-black animate-pulse">Cognitive Strategy Syncing...</p>
            </div>
          </div>
        )}

        <div ref={containerEndRef} />
      </div>

      {/* Input Form with Audio Simulator */}
      <form onSubmit={handleSend} className="p-4 bg-[#0D1222] border-t border-slate-950 shrink-0">
        <div className="flex gap-3 items-center">
          
          {/* Simulated Speech input pulse (Requested item!) */}
          <button
            type="button"
            onClick={() => {
              setIsVoiceActive(!isVoiceActive);
              if (!isVoiceActive) {
                // Mock speech input text triggers
                setTimeout(() => {
                  setInputVal("I need help to prioritize my remaining tasks today. They feel overwhelming.");
                  setIsVoiceActive(false);
                }, 2200);
              }
            }}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center relative transition cursor-pointer select-none ${
              isVoiceActive 
                ? 'bg-rose-500/10 border-rose-500 text-rose-400' 
                : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            {isVoiceActive ? (
              <>
                <span className="absolute inset-0 rounded-xl bg-rose-500/20 animate-ping" />
                <MicOff className="w-5 h-5" />
              </>
            ) : (
              <Mic className="w-5 h-5 animate-pulse" />
            )}
          </button>

          {/* Text entry field */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={isVoiceActive ? "Transcribing speech signals... Speak clearly" : "Describe what is stressing you out, or select a quick-action block..."}
              disabled={chatLoading}
              className="w-full bg-slate-950 border border-slate-900 focus:border-teal-500 focus:outline-none rounded-xl py-3 pl-4 pr-12 text-xs text-white placeholder-slate-500 transition font-sans"
            />
            
            <button
              type="submit"
              disabled={!inputVal.trim() || chatLoading}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:bg-slate-950 border border-teal-500/10 text-slate-950 disabled:text-slate-600 flex items-center justify-center transition cursor-pointer disabled:cursor-not-allowed select-none"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>

        {isVoiceActive && (
          <div className="text-[10px] font-mono text-rose-400 font-bold uppercase animate-pulse mt-2 flex items-center gap-1">
            <AlertOctagon className="w-3.5 h-3.5" /> Speak clearly. Listening to audio waveforms...
          </div>
        )}
      </form>

    </div>
  );
}
