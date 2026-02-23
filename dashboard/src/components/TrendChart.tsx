import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { format } from 'date-fns';

interface TrendChartProps {
  data: any[];
}

export default function TrendChart({ data }: TrendChartProps) {
  const formattedData = data.map((d: any) => ({
    ...d,
    date: typeof d.date === 'string' ? d.date : format(new Date(d.date), 'MMM d'),
    displayDate: typeof d.date === 'string' 
      ? format(new Date(d.date), 'MMM d') 
      : format(new Date(d.date), 'MMM d'),
  }));

  if (formattedData.length === 0) {
    return (
      <div className="bg-graphite border border-smoke rounded-lg p-6 h-80 flex items-center justify-center">
        <span className="text-ash font-mono text-sm">NO TREND DATA YET</span>
      </div>
    );
  }

  return (
    <div className="bg-graphite border border-smoke rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-mono tracking-widest text-silver uppercase">
          Activity Trend
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-[2px] bg-snow" />
            <span className="text-[10px] font-mono text-silver">FOCUS</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-[2px] bg-ash" />
            <span className="text-[10px] font-mono text-silver">IDLE</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={formattedData}>
          <defs>
            <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#262626" 
            vertical={false} 
          />
          <XAxis 
            dataKey="displayDate" 
            tick={{ fill: '#737373', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#262626' }}
          />
          <YAxis 
            tick={{ fill: '#737373', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="focus_time"
            stroke="#ffffff"
            strokeWidth={2}
            fill="url(#focusGradient)"
          />
          <Line
            type="monotone"
            dataKey="idle_time"
            stroke="#404040"
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-steel border border-smoke rounded-lg p-3 shadow-xl">
      <p className="text-[10px] font-mono text-silver mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="text-xs font-mono text-fog">
            {entry.dataKey === 'focus_time' ? 'Focus' : 'Idle'}
          </span>
          <span className="text-xs font-mono font-bold text-snow">
            {entry.value} min
          </span>
        </div>
      ))}
    </div>
  );
}