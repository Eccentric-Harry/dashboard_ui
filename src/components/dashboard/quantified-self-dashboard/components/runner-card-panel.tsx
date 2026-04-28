import runnerCard from '../../../../assets/reference-crops/runner-card.png'

function RunnerCardPanel() {
  return (
    <section className="runner-card" aria-label="12 kilometer running">
      <img src={runnerCard} alt="" />
    </section>
  )
}

export { RunnerCardPanel }
