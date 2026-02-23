import { Brain } from 'lucide-react';
import { format } from 'date-fns';

interface InsightPanelProps {
  insights: any[];
}

export default function InsightPanel({ insights }: InsightPanelProps) {
  if (insights.length === 0) {
    return (
      <div className="bg-graphite border border-smoke rounded-lg p-6 h-full flex flex-col items-center justify-center gap-3">
        <Brain size={24} className="text-ash" />
        <span className="text-ash font-mono text-sm">NO INSIGHTS YET</span>
        <span className="text-ash font-mono text-[10px]">
          System needs more data
        </span>
      </div>
    );
  }

  return (
    <div className="bg-graphite border border-smoke rounded-lg p-6 h-full">
      <div className="flex items-center gap-2 mb-6">
        <Brain size={14} className="text-silver" />
        <h3 className="text-xs font-mono tracking-widest text-silver uppercase">
          AI Insights
        </h3>
      </div>
      <div className="space-y-4 max-h-72 overflow-y-auto">
        {insights.map((insight: any, i: number) => (
          <div 
            key={i} 
            className="border-l-2 border-ash pl-4 py-2 hover:border-snow transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono text-ash">
                {format(new Date(insight.created_at), 'MMM d, HH:mm')}
              </span>
              <span className="text-[10px] font-mono text-ash px-1.5 py-0.5 bg-smoke rounded">
                {insight.tokens_used} tokens
              </span>
            </div>
            <p className="text-sm text-fog leading-relaxed">
              {insight.insight}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}