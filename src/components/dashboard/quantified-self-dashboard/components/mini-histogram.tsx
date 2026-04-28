

function MiniHistogram({ active = 4 }: { active?: number }) {
  return (
    <div className="mini-histogram" aria-hidden="true">
      {Array.from({ length: 20 }, (_, index) => (
        <span key={index} className={index === active ? 'active' : undefined} />
      ))}
    </div>
  )
}

export { MiniHistogram }
