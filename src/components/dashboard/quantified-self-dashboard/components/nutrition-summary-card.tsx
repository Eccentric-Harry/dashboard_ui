import { useDashboard } from '../../../../contexts/DashboardContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CircularStat = ({ data, label, unit, isLoading }: { data: any, label: string, unit: string, isLoading: boolean }) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min((data.current / data.target) * 100, 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-2.5 bg-white rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex-1 min-w-0">
      <div className="relative w-[76px] h-[76px] flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            className={`stroke-current ${data.track}`}
            strokeWidth="9"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            className={`stroke-current ${data.color} drop-shadow-md`}
            strokeWidth="9"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-base font-bold text-slate-800 leading-tight">{isLoading ? '...' : `${Math.round(percentage)}%`}</span>
          <span className="text-[10px] font-medium text-slate-500 leading-none mt-0.5">{label}</span>
        </div>
      </div>
      <div className="mt-2.5 text-center flex flex-col">
        <span className="text-xs font-bold text-slate-800">{isLoading ? '-' : data.current}</span>
        <span className="text-[9px] text-slate-400 font-medium">/ {data.target}{unit}</span>
      </div>
    </div>
  );
};
function IndicatorCard() {
  const { data, isLoading } = useDashboard();
  
  if (isLoading) {
    return (
      <section className="indicator-panel" style={{ display: 'flex', flexDirection: 'column', padding: '24px 22px', boxSizing: 'border-box' }}>
        <div className="mb-4">
          <span className="runner-eyebrow">NUTRITION SUMMARY</span>
          <div className="skeleton-shimmer skeleton-rect" style={{ width: '140px', height: '12px', marginTop: '8px', borderRadius: '3px' }} />
        </div>
        
        <div className="flex flex-row gap-4 w-full justify-center items-center flex-1">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="flex flex-col items-center justify-center p-2.5 bg-white rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex-1 min-w-0" style={{ minHeight: '130px' }}>
              <div className="skeleton-shimmer skeleton-circle" style={{ width: '72px', height: '72px' }} />
              <div className="skeleton-shimmer skeleton-rect" style={{ width: '45px', height: '12px', marginTop: '12px', borderRadius: '3px' }} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const circularGoals = data?.health?.circularGoals;

  const getGoalData = (label: string, defaultCurrent: number, defaultTarget: number, color: string, track: string) => {
    if (!circularGoals) return { current: defaultCurrent, target: defaultTarget, color, track };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const goal = circularGoals.find((g: any) => g.label.toLowerCase() === label.toLowerCase());
    return {
      current: goal ? goal.value : defaultCurrent,
      target: goal ? goal.target : defaultTarget,
      color,
      track
    };
  };

  const calories = { ...getGoalData('Calories', 1840, 2000, "text-[#101312]", "text-[#101312]/5"), target: 2000 };

  const protein = { ...getGoalData('Protein', 75, 100, "text-[#eaff28]", "text-[#eaff28]/20"), target: 100 };

  return (
    <section className="indicator-panel" style={{ display: 'flex', flexDirection: 'column', padding: '24px 22px', boxSizing: 'border-box' }}>
      <div className="mb-4">
        <span className="runner-eyebrow">NUTRITION SUMMARY</span>
        <p className="text-[11px] text-slate-500 font-medium m-0 mt-1.5">{isLoading ? 'Loading...' : `${Math.round(calories.current / calories.target * 100)}% of calories logged`}</p>
      </div>
      
      <div className="flex flex-row gap-4 w-full justify-center items-center flex-1">
        <CircularStat data={calories} label="Calories" unit="kcal" isLoading={isLoading} />
        <CircularStat data={protein} label="Protein" unit="g" isLoading={isLoading} />
      </div>
    </section>
  )
}

export { IndicatorCard }
