/** The one way Home says "overdue": rose dot + count, matching the Tasks card's count strip. */
function OverdueBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="home-overdue-badge" role="status">
      <i aria-hidden="true" />
      {count} overdue
    </span>
  )
}

export { OverdueBadge }
