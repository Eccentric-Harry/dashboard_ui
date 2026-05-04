import { useState, useRef, useEffect } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import {
  getIntensityForDay,
  getDateStringForDay,
  learningLogs,
  LEARNING_CATEGORIES,
} from '../learning-data'
import type { LearningCategory } from '../learning-data'

import { type AppPath } from '../data'
import { useDashboard } from '../../../../contexts/DashboardContext';

function SavingsCard({ onNavigate }: { onNavigate?: (path: AppPath, search?: string) => void }) {
  const { data: apiData, isLoading } = useDashboard();
  const [filter, setFilter] = useState<LearningCategory>('All');
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Green intensity palette — matching the dashboard's earthy green tones
  const intensityColors = [
    'rgba(164, 200, 177, 0.45)',  // level 0 — solid light green distinct from the card background
    'rgba(122, 191, 147, 0.6)',   // level 1 — soft green
    'rgba(76, 175, 115, 0.8)',    // level 2 — mid green
    'rgba(39, 142, 85, 0.95)',    // level 3 — rich green
    '#0d6b3a',                    // level 4 — deep forest green
  ];

  const filteredLogs = learningLogs.filter(
    l => filter === 'All' || l.category === filter
  );
  
  const heatmapData = apiData?.coding?.learningHeatmap || [];

  return (
    <section className="savings-panel">
      {/* Header */}
      <div className="saving-head">
        <div>
          <span className="runner-eyebrow">Synapse Map</span>
          <p style={{ margin: '4px 0 0', fontSize: '9px', color: '#526057', fontWeight: 500 }}>
            {isLoading ? '...' : `${heatmapData.length || filteredLogs.slice(-91).length} nodes activated (3m)`}
          </p>
        </div>

        {/* Click-based dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              height: '26px',
              padding: '0 9px',
              border: '1px solid rgba(14,18,16,0.78)',
              borderRadius: '13px',
              background: 'transparent',
              color: '#111514',
              fontSize: '10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {filter}
            <ChevronsUpDown size={10} />
          </button>
          {open && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 4px)',
                width: '120px',
                background: '#fff',
                borderRadius: '12px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                border: '1px solid rgba(0,0,0,0.05)',
                zIndex: 20,
                padding: '4px',
                overflow: 'hidden',
              }}
            >
              {LEARNING_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => { setFilter(cat); setOpen(false); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    fontSize: '10px',
                    fontWeight: filter === cat ? 700 : 500,
                    border: 'none',
                    borderRadius: '8px',
                    background: filter === cat ? 'rgba(52,158,100,0.15)' : 'transparent',
                    color: filter === cat ? '#1a7a4a' : '#333',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 150ms ease',
                  }}
                  onMouseEnter={e => { if (filter !== cat) (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5'; }}
                  onMouseLeave={e => { if (filter !== cat) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Heatmap — centered, nothing cut off */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 18px 22px',
          flex: 1,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(13, 1fr)',
            gridTemplateRows: 'repeat(7, 1fr)',
            gap: '3px',
            width: '100%',
            maxWidth: '220px'
          }}
        >
          {Array.from({ length: 91 }).map((_, i) => {
            const daysAgo = 90 - i;
            const dateLabel = getDateStringForDay(daysAgo);
            
            let intensity = 0;
            if (heatmapData && heatmapData.length > 0) {
              const apiEntry = heatmapData.find((entry: any) => entry.date === dateLabel);
              if (apiEntry) intensity = apiEntry.intensity;
            } else {
              intensity = getIntensityForDay(daysAgo, filter);
            }

            return (
              <div
                key={i}
                onClick={() => onNavigate?.('/learnings', `?date=${encodeURIComponent(dateLabel)}`)}
                title={`${dateLabel} · ${intensity > 0 ? `${intensity} session${intensity > 1 ? 's' : ''}` : 'No activity'}`}
                style={{
                  aspectRatio: '1/1',
                  background: intensityColors[intensity],
                  borderRadius: '2px',
                  transition: 'background-color 0.25s ease, transform 0.1s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '12px',
            width: '100%',
            maxWidth: '220px',
            fontSize: '9px',
            color: '#7a8a7d',
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          <span>PAST 3 MONTHS</span>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {intensityColors.map((c, idx) => (
              <div
                key={idx}
                style={{ width: '8px', height: '8px', background: c, borderRadius: '1.5px', flexShrink: 0 }}
              />
            ))}
          </div>
          <span>TODAY</span>
        </div>
      </div>
    </section>
  );
}

export { SavingsCard }
