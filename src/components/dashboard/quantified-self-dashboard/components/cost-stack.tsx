import { costCards } from '../data'
import { MiniHistogram } from './mini-histogram'

function CostStack() {
  return (
    <section className="cost-stack">
      {costCards.map((card) => (
        <div key={card.variant} className={`cost-card ${card.variant}`}>
          <h3>
            {card.titleLines[0]}
            <br />
            {card.titleLines[1]}
          </h3>
          <MiniHistogram active={card.histogramActiveIndex} data={card.histogramData} />
          <b>{card.value}</b>
          <span>{card.percent}</span>
        </div>
      ))}
    </section>
  )
}

export { CostStack }
