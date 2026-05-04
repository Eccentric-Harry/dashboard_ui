import { costCards } from '../data'
import { MiniHistogram } from './mini-histogram'
import { useDashboard } from '../../../../contexts/DashboardContext';

function CostStack() {
  const { data, isLoading } = useDashboard();
  
  const budgetItems = data?.finance?.budgetItems || [];
  
  // Format numbers to k/m (e.g. 4500 -> 4.5k)
  const formatCurrency = (val: number) => {
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
    return `₹${val}`;
  };

  // Map backend budget items to cost cards
  const cards = costCards.map(card => {
    if (isLoading) return card;
    
    // Map variant to backend category
    let category = '';
    if (card.variant === 'food') category = 'Food & Drink'; // or Groceries
    else if (card.variant === 'travel') category = 'Shopping'; // Just as an example mapping
    else if (card.variant === 'saving') return {
      ...card,
      value: formatCurrency(data?.finance?.totalBudget - data?.finance?.totalSpent || 2500),
      percent: `${data?.finance?.savingsRatePercent?.toFixed(1) || 42.7}%`
    };
    
    const item = budgetItems.find((b: any) => b.category === category);
    if (item) {
      return {
        ...card,
        value: formatCurrency(item.spent),
        percent: `${item.utilizationPercent.toFixed(1)}%`
      };
    }
    return card;
  });

  return (
    <section className="cost-stack">
      {cards.map((card) => (
        <div key={card.variant} className={`cost-card ${card.variant}`}>
          <h3>
            {card.titleLines[0]}
            <br />
            {card.titleLines[1]}
          </h3>
          <MiniHistogram active={card.histogramActiveIndex} data={card.histogramData} />
          <b>{isLoading ? '-' : card.value}</b>
          <span>{isLoading ? '-' : card.percent}</span>
        </div>
      ))}
    </section>
  )
}

export { CostStack }
