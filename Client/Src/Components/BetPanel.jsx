import { useState } from "react";

const QUICK_BETS = [50, 100, 500, 1000];

export default function BetPanel({
  balance,
  gameState,
  activeBet,
  onPlaceBet,
  onCashOut,
  multiplier,
}) {
  const [bet, setBet] = useState(100);

  const canBet = gameState === "waiting" && !activeBet && balance >= bet;
  const canCashOut = gameState === "running" && activeBet;

  const handleBetChange = (val) => {
    const n = Math.max(10, Math.min(Number(val) || 10, balance));
    setBet(n);
  };

  return (
    <div className="bet-panel">
      <div className="balance-row">
        <span className="balance-label">Balance</span>
        <span className="balance-value">KES {balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
      </div>

      <div className="bet-input-row">
        <label className="input-label">Bet amount</label>
        <div className="input-group">
          <span className="currency-prefix">KES</span>
          <input
            type="number"
            min={10}
            max={balance}
            value={bet}
            onChange={(e) => handleBetChange(e.target.value)}
            className="bet-input"
            disabled={gameState !== "waiting" || activeBet}
          />
        </div>

        <div className="quick-bets">
          {QUICK_BETS.map((q) => (
            <button
              key={q}
              className="quick-btn"
              onClick={() => handleBetChange(q)}
              disabled={gameState !== "waiting" || activeBet || q > balance}
            >
              {q >= 1000 ? `${q / 1000}K` : q}
            </button>
          ))}
          <button
            className="quick-btn"
            onClick={() => handleBetChange(Math.floor(balance / 2))}
            disabled={gameState !== "waiting" || activeBet}
          >
            ½
          </button>
          <button
            className="quick-btn"
            onClick={() => handleBetChange(balance)}
            disabled={gameState !== "waiting" || activeBet}
          >
            MAX
          </button>
        </div>
      </div>

      {!activeBet ? (
        <button
          className={`action-btn bet-btn ${!canBet ? "disabled" : ""}`}
          onClick={() => canBet && onPlaceBet(bet)}
          disabled={!canBet}
        >
          {gameState === "waiting" ? `Place Bet — KES ${bet.toLocaleString()}` : "Waiting for next round…"}
        </button>
      ) : (
        <button
          className={`action-btn cashout-btn ${!canCashOut ? "locked" : ""}`}
          onClick={() => canCashOut && onCashOut()}
        >
          {canCashOut
            ? `Cash Out @ ${multiplier}x — KES ${(bet * multiplier).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`
            : gameState === "waiting"
            ? "Bet placed ✓"
            : "Cashing out…"}
        </button>
      )}
    </div>
  );
}
