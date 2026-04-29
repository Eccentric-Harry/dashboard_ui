import { getQuoteOfDay } from '../quotes-data'

function ProductsCard() {
  const quote = getQuoteOfDay();

  return (
    <section className="products-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', textAlign: 'center' }}>
      <blockquote style={{ margin: 0, padding: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 500, fontStyle: 'italic', color: '#101312', lineHeight: '1.5', margin: '0 0 12px 0' }}>
          "{quote.text}"
        </p>
        <cite style={{ fontSize: '10px', fontWeight: 600, color: '#686e69', fontStyle: 'normal', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          — {quote.author}
        </cite>
      </blockquote>
    </section>
  )
}

export { ProductsCard }
