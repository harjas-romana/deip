import { useState } from 'react';
import Dashboard from './components/Dashboard';
import Simulator from './components/Simulator';
import { BarChart3, Radio } from 'lucide-react';

type Page = 'dashboard' | 'simulator';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const userId = 'harjas';

  return (
    <div className="min-h-screen bg-carbon">
      {/* Top Nav */}
      <nav className="border-b border-smoke">
        <div className="max-w-7xl mx-auto px-8 flex items-center gap-0">
          <NavButton 
            active={page === 'dashboard'} 
            onClick={() => setPage('dashboard')}
            icon={<BarChart3 size={14} />}
            label="Dashboard"
          />
          <NavButton 
            active={page === 'simulator'} 
            onClick={() => setPage('simulator')}
            icon={<Radio size={14} />}
            label="Simulator"
          />
        </div>
      </nav>

      {/* Page Content */}
      {page === 'dashboard' && <Dashboard userId={userId} />}
      {page === 'simulator' && (
        <div className="max-w-4xl mx-auto px-8 py-8">
          <Simulator userId={userId} />
        </div>
      )}
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-4 font-mono text-xs tracking-widest uppercase 
        border-b-2 transition-all
        ${active 
          ? 'text-snow border-snow' 
          : 'text-ash border-transparent hover:text-fog hover:border-ash'
        }`}
    >
      {icon}
      {label}
    </button>
  );
}