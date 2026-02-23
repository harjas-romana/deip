import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Zap, Monitor, Clock, MessageSquare, BookOpen, 
  Smartphone, Play, Square, Send, Loader2 
} from 'lucide-react';

declare global {
  interface NodeJS {
    Timeout: ReturnType<typeof setTimeout>;
  }
}

const API_URL = import.meta.env.VITE_INGESTION_URL || 'http://localhost:3000';

const EVENT_TYPES = [
  { type: 'FOCUS_SESSION', icon: <Zap size={14} />, label: 'Focus Session', hasDuration: true, color: 'hover:border-good/50' },
  { type: 'TAB_SWITCH', icon: <Monitor size={14} />, label: 'Tab Switch', hasDuration: false, color: 'hover:border-warn/50' },
  { type: 'IDLE_TIME', icon: <Clock size={14} />, label: 'Idle Time', hasDuration: true, color: 'hover:border-danger/50' },
  { type: 'WHATSAPP_MESSAGE', icon: <MessageSquare size={14} />, label: 'WhatsApp Msg', hasDuration: false, color: 'hover:border-warn/50' },
  { type: 'STUDY_SESSION', icon: <BookOpen size={14} />, label: 'Study Session', hasDuration: true, color: 'hover:border-good/50' },
  { type: 'APP_OPEN', icon: <Smartphone size={14} />, label: 'App Open', hasDuration: false, color: 'hover:border-snow/50' },
];

interface EventLog {
  id: string;
  type: string;
  status: 'sent' | 'error';
  timestamp: number;
  eventId?: string;
}

export default function Simulator({ userId }: { userId: string }) {
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [duration, setDuration] = useState(30);
  const [eventsPerMinute, setEventsPerMinute] = useState(5);
  const autoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  const sendEvent = useMutation({
    mutationFn: async (eventType: string) => {
      const hasDuration = EVENT_TYPES.find(e => e.type === eventType)?.hasDuration;
      const event = {
        userId,
        eventType,
        timestamp: Date.now(),
        ...(hasDuration ? { duration: Math.floor(Math.random() * 60) + 5 } : {}),
      };

      const response = await axios.post(`${API_URL}/events`, event);
      return response.data;
    },
    onSuccess: (data, eventType) => {
      setLogs(prev => [{
        id: crypto.randomUUID(),
        type: eventType,
        status: 'sent',
        timestamp: Date.now(),
        eventId: data.eventId,
      }, ...prev].slice(0, 50));

      // Refresh dashboard data
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error, eventType) => {
      setLogs(prev => [{
        id: crypto.randomUUID(),
        type: eventType,
        status: 'error',
        timestamp: Date.now(),
      }, ...prev].slice(0, 50));
    },
  });

  const sendRandomEvent = () => {
    const randomType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
    sendEvent.mutate(randomType.type);
  };

  const startAutoMode = () => {
    setIsAutoRunning(true);
    const interval = (60 / eventsPerMinute) * 1000;
    autoIntervalRef.current = setInterval(sendRandomEvent, interval);
  };

  const stopAutoMode = () => {
    setIsAutoRunning(false);
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
  };

  const sendBurst = async (count: number) => {
    for (let i = 0; i < count; i++) {
      sendRandomEvent();
      await new Promise(r => setTimeout(r, 200));
    }
  };

  return (
    <div className="space-y-6">
      {/* Manual Event Buttons */}
      <div className="bg-graphite border border-smoke rounded-lg p-6">
        <h3 className="text-xs font-mono tracking-widest text-silver uppercase mb-4">
          Manual Events
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {EVENT_TYPES.map(event => (
            <button
              key={event.type}
              onClick={() => sendEvent.mutate(event.type)}
              disabled={sendEvent.isPending}
              className={`flex items-center gap-2 px-4 py-3 bg-steel border border-smoke rounded-lg 
                ${event.color} transition-all active:scale-95 disabled:opacity-50`}
            >
              <span className="text-fog">{event.icon}</span>
              <span className="text-sm font-mono text-fog">{event.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Auto Mode */}
      <div className="bg-graphite border border-smoke rounded-lg p-6">
        <h3 className="text-xs font-mono tracking-widest text-silver uppercase mb-4">
          Auto Generator
        </h3>
        
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-ash">RATE:</span>
            <input
              type="range"
              min="1"
              max="30"
              value={eventsPerMinute}
              onChange={(e) => setEventsPerMinute(parseInt(e.target.value))}
              className="w-32 accent-white"
              disabled={isAutoRunning}
            />
            <span className="text-xs font-mono text-fog w-16">{eventsPerMinute}/min</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isAutoRunning ? (
            <button
              onClick={startAutoMode}
              className="flex items-center gap-2 px-4 py-2 bg-snow text-carbon rounded-lg 
                font-mono text-sm font-bold hover:bg-cloud transition-all active:scale-95"
            >
              <Play size={14} />
              START AUTO
            </button>
          ) : (
            <button
              onClick={stopAutoMode}
              className="flex items-center gap-2 px-4 py-2 bg-danger text-snow rounded-lg 
                font-mono text-sm font-bold hover:bg-danger/80 transition-all active:scale-95"
            >
              <Square size={14} />
              STOP
            </button>
          )}

          <button
            onClick={() => sendBurst(10)}
            className="flex items-center gap-2 px-4 py-2 bg-steel border border-smoke rounded-lg 
              font-mono text-sm text-fog hover:border-ash transition-all active:scale-95"
          >
            <Send size={14} />
            BURST 10
          </button>

          <button
            onClick={() => sendBurst(50)}
            className="flex items-center gap-2 px-4 py-2 bg-steel border border-smoke rounded-lg 
              font-mono text-sm text-fog hover:border-ash transition-all active:scale-95"
          >
            <Send size={14} />
            BURST 50
          </button>

          {isAutoRunning && (
            <div className="flex items-center gap-2 ml-4">
              <Loader2 size={14} className="animate-spin text-good" />
              <span className="text-xs font-mono text-good">GENERATING...</span>
            </div>
          )}
        </div>
      </div>

      {/* Event Log */}
      <div className="bg-graphite border border-smoke rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-mono tracking-widest text-silver uppercase">
            Event Log
          </h3>
          <span className="text-[10px] font-mono text-ash">
            {logs.length} events sent
          </span>
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-ash py-4 text-center">No events sent yet</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-smoke/50">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  log.status === 'sent' ? 'bg-good' : 'bg-danger'
                }`} />
                <span className="text-fog w-36">{log.type.replace(/_/g, ' ')}</span>
                <span className="text-ash flex-1 truncate">{log.eventId || 'failed'}</span>
                <span className="text-ash">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}