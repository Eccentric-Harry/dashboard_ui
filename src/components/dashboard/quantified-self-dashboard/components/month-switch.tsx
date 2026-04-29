import { monthSwitchLabels, monthSwitchNumbers } from '../data'

function MonthSwitch() {
  return (
    <div className="month-switch">
      {monthSwitchLabels.map((label, index) => (
        <small key={`${label}-${index}`}>{label}</small>
      ))}
      <div>
        {monthSwitchNumbers.map((value, index) => (
          <span key={value} className={index === 1 ? 'active' : undefined}>
            {value}
          </span>
        ))}
      </div>
    </div>
  )
}

export { MonthSwitch }
