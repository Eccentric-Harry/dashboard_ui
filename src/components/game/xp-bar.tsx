type XpBarProps = {
  level: number
  /** XP earned inside the current level. */
  xpIntoLevel: number
  /** XP span of the current level. */
  xpForNextLevel: number
}

/**
 * Thin level-progress bar + level number. XP is monotonic — this bar only
 * ever moves forward; never render a negative delta around it.
 */
function XpBar({ level, xpIntoLevel, xpForNextLevel }: XpBarProps) {
  const ratio = xpForNextLevel > 0 ? Math.min(Math.max(xpIntoLevel / xpForNextLevel, 0), 1) : 0
  return (
    <span
      className="game-xp-bar"
      role="img"
      aria-label={`Level ${level}, ${xpIntoLevel} of ${xpForNextLevel} XP to next level`}
    >
      <span className="game-xp-bar-level">Lv {level}</span>
      <span className="game-xp-bar-track" aria-hidden="true">
        <span className="game-xp-bar-fill" style={{ width: `${ratio * 100}%` }} />
      </span>
    </span>
  )
}

export { XpBar }
