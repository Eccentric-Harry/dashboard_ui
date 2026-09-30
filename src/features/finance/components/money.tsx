// A display figure in rupees: the ₹ set small and raised beside the digits, the way
// fintech apps set a currency sign on a headline number, so the figure reads first.
// For hero-sized numbers only — list rows keep the plain `₹1,234` string.

interface MoneyProps {
  value: number
  /** Shown before the ₹; the value itself is always rendered unsigned. */
  sign?: '+' | '−' | ''
  className?: string
}

function Money({ value, sign = '', className }: MoneyProps) {
  return (
    <span className={className ? `fin-money ${className}` : 'fin-money'}>
      {sign}
      <span className="fin-money-cur">₹</span>
      {Math.round(Math.abs(value)).toLocaleString('en-IN')}
    </span>
  )
}

export { Money }
