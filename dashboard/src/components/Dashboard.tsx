import { useQuery } from '@tanstack/react-query';
import { fetchMetrics, fetchInsights, fetchRecentEvents, fetchStreamInfo } from '../api';
import { 
  Activity, 
  Brain, 
  Clock, 
  Monitor, 
  MessageSquare, 
  BookOpen, 
  Zap,
  AlertTriangle 
} from 'lucide-react';
import EventFeed from './EventFeed';
import InsightPanel from './InsightPanel';
import StatCard from './StatCard';
import SystemStatus from './SystemStatus';
import TrendChart from './TrendChart';

interface DashboardProps {
  userId: string;
}

export default function Dashboard({ userId }: DashboardProps) {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['metrics', userId],
    queryFn: () => fetchMetrics(userId),
  });

  const { data: insights } = useQuery({
    queryKey: ['insights', userId],
    queryFn: () => fetchInsights(userId),
  });

  const { data: recentEvents } = useQuery({
    queryKey: ['events', userId],
    queryFn: () => fetchRecentEvents(userId),
  });

  const { data: streamInfo } = useQuery({
    queryKey: ['stream'],
    queryFn: fetchStreamInfo,
  });

  if (metricsLoading) {
    return (
      <div className="min-h-screen bg-carbon flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-snow border-t-transparent rounded-full animate-spin" />
          <span className="text-silver font-mono text-sm tracking-widest uppercase">
            Loading Systems
          </span>
        </div>
      </div>
    );
  }

  const today = metrics?.today || {};
  const focusRatio = today.event_count > 0 
    ? Math.round((today.focus_time / Math.max(today.focus_time + today.idle_time, 1)) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-carbon">
      {/* Header */}
<header className="border-b border-smoke px-8 py-6">
  <div className="max-w-7xl mx-auto flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div className="w-2 h-2 rounded-full bg-good animate-pulse" />
      <h1 className="text-xl font-bold tracking-tight text-snow">
        DEIP
      </h1>
      <span className="text-silver font-mono text-xs tracking-widest uppercase">
        Distributed Event Intelligence
      </span>
    </div>
    <div className="flex items-center gap-6">
      <span className="text-silver font-mono text-xs">
        USER: {userId.toUpperCase()}
      </span>
      <span className="text-ash font-mono text-xs">
        {new Date().toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        }).toUpperCase()}
      </span>
    </div>
  </div>
</header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* System Status Bar */}
        <SystemStatus streamInfo={streamInfo} totalEvents={metrics?.totalEvents || 0} />

        {/* Primary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <StatCard
            label="FOCUS TIME"
            value={`${today.focus_time || 0}`}
            unit="min"
            icon={<Zap size={16} />}
            status={today.focus_time > 60 ? 'good' : today.focus_time > 30 ? 'warn' : 'danger'}
          />
          <StatCard
            label="IDLE TIME"
            value={`${today.idle_time || 0}`}
            unit="min"
            icon={<Clock size={16} />}
            status={today.idle_time < 30 ? 'good' : today.idle_time < 60 ? 'warn' : 'danger'}
          />
          <StatCard
            label="TAB SWITCHES"
            value={`${today.tab_switches || 0}`}
            unit=""
            icon={<Monitor size={16} />}
            status={today.tab_switches < 10 ? 'good' : today.tab_switches < 25 ? 'warn' : 'danger'}
          />
          <StatCard
            label="FOCUS RATIO"
            value={`${focusRatio}`}
            unit="%"
            icon={<Activity size={16} />}
            status={focusRatio > 70 ? 'good' : focusRatio > 40 ? 'warn' : 'danger'}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <StatCard
            label="MESSAGES"
            value={`${today.whatsapp_messages || 0}`}
            unit=""
            icon={<MessageSquare size={16} />}
            status={today.whatsapp_messages < 10 ? 'good' : 'warn'}
          />
          <StatCard
            label="STUDY SESSIONS"
            value={`${today.study_sessions || 0}`}
            unit=""
            icon={<BookOpen size={16} />}
            status={today.study_sessions > 0 ? 'good' : 'danger'}
          />
          <StatCard
            label="TOTAL EVENTS"
            value={`${today.event_count || 0}`}
            unit=""
            icon={<Activity size={16} />}
            status="neutral"
          />
        </div>

        {/* Charts + Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Trend Chart */}
          <div className="lg:col-span-2">
            <TrendChart data={metrics?.history || []} />
          </div>

          {/* AI Insights */}
          <div>
            <InsightPanel insights={insights?.insights || []} />
          </div>
        </div>

        {/* Event Feed + Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <EventFeed events={recentEvents?.events || []} />
          <BreakdownPanel breakdown={metrics?.breakdown || []} />
        </div>
      </main>
    </div>
  );
}

function BreakdownPanel({ breakdown }: { breakdown: any[] }) {
  const total = breakdown.reduce((sum: number, item: any) => sum + parseInt(item.count), 0);

  return (
    <div className="bg-graphite border border-smoke rounded-lg p-6">
      <h3 className="text-xs font-mono tracking-widest text-silver uppercase mb-6">
        Event Distribution
      </h3>
      <div className="space-y-4">
        {breakdown.map((item: any) => {
          const percentage = total > 0 ? Math.round((parseInt(item.count) / total) * 100) : 0;
          return (
            <div key={item.event_type}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-fog text-sm font-mono">
                  {item.event_type.replace('_', ' ')}
                </span>
                <span className="text-snow text-sm font-bold font-mono">
                  {item.count}
                </span>
              </div>
              <div className="w-full h-1 bg-smoke rounded-full overflow-hidden">
                <div 
                  className="h-full bg-snow rounded-full transition-all duration-1000"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}