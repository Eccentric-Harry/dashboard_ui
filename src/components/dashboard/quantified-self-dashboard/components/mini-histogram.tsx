

function MiniHistogram({ active = 4, data = [] }: { active?: number, data?: number[] }) {
  // Use provided data or fallback to a flat array
  const displayData = data.length > 0 ? data : Array.from({ length: 20 }, () => 20)

  return (
    <div className="mini-histogram" aria-hidden="true" style={{ display: 'flex', alignItems: 'flex-end', height: '40px', gap: '3px' }}>
      {displayData.map((height, index) => (
        <span 
          key={index} 
          className={index === active ? 'active' : undefined} 
          style={{ 
            height: `${height}%`, 
            width: '4px', 
            borderRadius: '2px', 
            background: index === active ? '#0d1110' : 'rgba(32, 37, 34, 0.12)', 
            opacity: index === active ? 1 : 0.6 
          }}
        />
      ))}
    </div>
  )
}

export { MiniHistogram }
