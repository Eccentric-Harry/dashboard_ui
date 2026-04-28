import { dateTiles } from '../data'

function DateTiles() {
  return (
    <div className="date-tiles">
      {dateTiles.map((tile) => (
        <div key={tile.value} className={'active' in tile && tile.active ? 'date-tile date-tile-active' : 'date-tile'}>
          {'accent' in tile && tile.accent ? <i /> : null}
          <span>{tile.value}</span>
          <small />
        </div>
      ))}
    </div>
  )
}

export { DateTiles }
