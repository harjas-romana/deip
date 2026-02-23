import { formatDistanceToNow } from 'date-fns';
import { 
  Zap, 
  Monitor, 
  Clock, 
  MessageSquare, 
  BookOpen, 
  Smartphone 
} from 'lucide-react';

interface EventFeedProps {
  events: any[];
}

const eventIcons: Record<string, React.ReactNode> = {
  FOCUS_SESSION: <Zap size={12} />,
  TAB_SWITCH: <Monitor size={12} />,
  IDLE_TIME: <Clock size={12} />,
  WHATSAPP_MESSAGE: <MessageSquare size={12} />,
  STUDY_SESSION: <BookOpen size={12} />,
  APP_OPEN: <Smartphone size={12} />,
};

export default function EventFeed({ events }: EventFeedProps) {
  if (events.length === 0) {
    return (
      <div className="bg-graphite border border-smoke rounded-lg p-6 flex items-center justify-center h-64">
        <span className="text-ash font-mono text-sm">NO EVENTS YET</span>
      </div>
    );
  }

  return (
    <div className="bg-graphite border border-smoke rounded-lg p-6">
      <h3 className="text-xs font-mono tracking-widest text-silver uppercase mb-6">
        Live Event Feed
      </h3>
      <div className="space-y-1 max-h-72 overflow-y-auto">
        {events.map((event: any) => (
          <div 
            key={event.event_id}
            className="flex items-center gap-3 py-2 px-3 rounded hover:bg-smoke/50 transition-colors group"
          >
            {/* Timeline dot */}
            <div className="flex flex-col items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-ash group-hover:bg-snow transition-colors" />
            </div>
            
            {/* Icon */}
            <span className="text-ash group-hover:text-fog transition-colors">
              {eventIcons[event.event_type] || <Zap size={12} />}
            </span>
            
            {/* Event type */}
            <span className="text-xs font-mono text-fog flex-1">
              {event.event_type.replace(/_/g, ' ')}
            </span>
            
            {/* Time */}
            <span className="text-[10px] font-mono text-ash">
              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}