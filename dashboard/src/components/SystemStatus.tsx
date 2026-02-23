interface SystemStatusProps {
  streamInfo: any;
  totalEvents: number;
}

export default function SystemStatus({ streamInfo, totalEvents }: SystemStatusProps) {
  return (
    <div className="bg-graphite border border-smoke rounded-lg px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <StatusItem 
            label="PIPELINE" 
            value="ACTIVE" 
            dot="bg-good" 
          />
          <StatusItem 
            label="EVENTS STREAM" 
            value={`${streamInfo?.eventsStream || 0}`} 
            dot="bg-good" 
          />
          <StatusItem 
            label="AI QUEUE" 
            value={`${streamInfo?.aiQueue || 0}`} 
            dot={streamInfo?.aiQueue > 10 ? 'bg-warn' : 'bg-good'} 
          />
          <StatusItem 
            label="TOTAL PROCESSED" 
            value={`${totalEvents}`} 
            dot="bg-snow" 
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-good animate-pulse" />
          <span className="text-[10px] font-mono text-silver tracking-widest">
            LIVE
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusItem({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-1 h-1 rounded-full ${dot}`} />
      <span className="text-[10px] font-mono text-ash tracking-widest">
        {label}:
      </span>
      <span className="text-[10px] font-mono text-fog font-bold">
        {value}
      </span>
    </div>
  );
}