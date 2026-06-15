export default function PlayersList({ players }) {
  if (!players || players.length === 0) {
    return (
      <div className="players-panel">
        <h3 className="panel-title">Players</h3>
        <p className="empty-label">No active players</p>
      </div>
    );
  }

  return (
    <div className="players-panel">
      <h3 className="panel-title">Players <span className="count-badge">{players.length}</span></h3>
      <div className="players-list">
        {players.map((p) => (
          <div key={p.id} className={`player-row ${p.cashedOut ? "cashed" : ""}`}>
            <span className="player-name">{p.name}</span>
            <span className="player-bet">
              {p.bet > 0 ? `KES ${p.bet.toLocaleString()}` : "—"}
            </span>
            {p.cashedOut && p.cashOutMultiplier && (
              <span className="player-cashout">
                {p.cashOutMultiplier}x
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
