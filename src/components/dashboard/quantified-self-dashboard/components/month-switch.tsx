import { monthSwitchLabels, monthSwitchNumbers } from '../data'

function MonthSwitch() {
  return (
    <div className="month-switch">
      {monthSwitchLabels.map((label) => (
        <small key={label}>{label}</small>
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
