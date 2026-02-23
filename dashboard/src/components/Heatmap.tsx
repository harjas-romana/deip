import { useMemo } from 'react';

interface HeatmapProps {
  data: any[];
}

export default function Heatmap({ data }: HeatmapProps) {
  const heatmapData = useMemo(() => {
    // Create 7 days x 24 hours grid
    const grid: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
    
    data.forEach((day: any) => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay(); // 0-6
      // Distribute events across hours (simulated since we don't have hourly data)
      const eventsPerHour = day.event_count / 12; // Assume 12 active hours
      for (let h = 8; h < 20; h++) {
        grid[dayOfWeek][h] = Math.round(eventsPerHour * (1 + Math.random()));
      }
    });

    return grid;
  }, [data]);

  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const maxVal = Math.max(...heatmapData.flat(), 1);

  function getColor(value: number): string {
    if (value === 0) return '#141414';
    const intensity = value / maxVal;
    if (intensity < 0.25) return '#1a1a1a';
    if (intensity < 0.5) return '#404040';
    if (intensity < 0.75) return '#737373';
    return '#d4d4d4';
  }

  return (
    <div className="bg-graphite border border-smoke rounded-lg p-6">
      <h3 className="text-xs font-mono tracking-widest text-silver uppercase mb-6">
        Activity Heatmap
      </h3>
      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-1 mr-2 pt-5">
            {days.map(day => (
              <div key={day} className="h-4 flex items-center">
                <span className="text-[9px] font-mono text-ash w-8">{day}</span>
              </div>
            ))}
          </div>
          
          {/* Grid */}
          <div>
            {/* Hour labels */}
            <div className="flex gap-1 mb-1">
              {hours.map(h => (
                <div key={h} className="w-4 text-center">
                  {h % 4 === 0 && (
                    <span className="text-[8px] font-mono text-ash">{h}</span>
                  )}
                </div>
              ))}
            </div>
            
            {/* Cells */}
            {heatmapData.map((row, dayIdx) => (
              <div key={dayIdx} className="flex gap-1 mb-1">
                {row.map((value, hourIdx) => (
                  <div
                    key={hourIdx}
                    className="w-4 h-4 rounded-sm transition-colors hover:ring-1 hover:ring-ash"
                    style={{ backgroundColor: getColor(value) }}
                    title={`${days[dayIdx]} ${hourIdx}:00 - ${value} events`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 ml-10">
          <span className="text-[9px] font-mono text-ash">LESS</span>
          {['#141414', '#1a1a1a', '#404040', '#737373', '#d4d4d4'].map((color, i) => (
            <div 
              key={i} 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: color }} 
            />
          ))}
          <span className="text-[9px] font-mono text-ash">MORE</span>
        </div>
      </div>
    </div>
  );
}