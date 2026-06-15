import { useEffect, useState } from "react";
import io from "socket.io-client";
import "./index.css";

const socket = io("http://localhost:5000");

export default function Admin() {
  const [playerName, setPlayerName] = useState("");
  const [depositAmount, setDepositAmount] = useState(1000);
  const [players, setPlayers] = useState([]);
  const [notification, setNotification] = useState(null);
  const [totalPool, setTotalPool] = useState(100000);
  const [remainingPool, setRemainingPool] = useState(100000);
  const [pendingPlayer, setPendingPlayer] = useState(null);
  const [copySuccess, setCopySuccess] = useState("");
  const [withdrawals, setWithdrawals] = useState([]);

  const showNotification = (msg, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const copyToClipboard = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopySuccess("Copied!");
      showNotification("Player code copied to clipboard!", "win");
      setTimeout(() => setCopySuccess(""), 2000);
    } catch (err) {
      showNotification("Failed to copy code", "error");
    }
  };

  const handleDeleteWithdrawal = (withdrawalId) => {
    socket.emit("deleteWithdrawal", { withdrawalId });
    showNotification("Withdrawal record deleted", "info");
  };

  useEffect(() => {
    socket.on("players", (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    socket.on("poolUpdate", ({ remainingPool }) => {
      setRemainingPool(remainingPool);
    });

    socket.on("init", ({ players, remainingPool, withdrawals }) => {
      setPlayers(players || []);
      setRemainingPool(remainingPool || totalPool);
      setWithdrawals(withdrawals || []);
    });

    socket.on("playerPending", ({ name, deposit, playerId }) => {
      setPendingPlayer({ name, deposit, playerId });
      showNotification(`Player "${name}" added!`, "win");
    });

    socket.on("playerClaimed", ({ name }) => {
      showNotification(`Player "${name}" has joined the game!`, "win");
      setPendingPlayer(null);
    });

    socket.on("withdrawalRecorded", ({ playerName, amount, totalWithdrawn, timestamp }) => {
      setWithdrawals(prev => [{ 
        id: Date.now(), 
        playerName, 
        amount, 
        totalWithdrawn,
        timestamp 
      }, ...prev].slice(0, 50));
      showNotification(`${playerName} withdrew KES ${amount.toLocaleString()}!`, "info");
    });

    socket.on("withdrawalDeleted", ({ withdrawalId }) => {
      setWithdrawals(prev => prev.filter(w => w.id !== withdrawalId));
      showNotification("Withdrawal record deleted", "info");
    });

    socket.on("error", ({ message }) => {
      showNotification(message, "error");
    });

    return () => socket.removeAllListeners();
  }, [totalPool]);

  const handleAddPlayer = () => {
    if (!playerName.trim()) {
      showNotification("Please enter player name", "error");
      return;
    }
    if (depositAmount < 10) {
      showNotification("Minimum deposit is KES 10", "error");
      return;
    }
    if (depositAmount > remainingPool) {
      showNotification(`Only KES ${remainingPool.toLocaleString()} remaining in pool!`, "error");
      return;
    }

    socket.emit("adminAddPlayer", { name: playerName, deposit: depositAmount });
    setPlayerName("");
    setDepositAmount(1000);
  };

  const handleRemovePlayer = (playerId) => {
    socket.emit("removePlayer", { playerId });
    showNotification("Player removed", "info");
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1> CHEMASEBET ADMIN</h1>
        <div className="pool-info">
          <span>Total Pool: KES {totalPool.toLocaleString()}</span>
          <span className="remaining">Remaining: KES {remainingPool.toLocaleString()}</span>
        </div>
      </div>

      <div className="admin-main">
        {/* Left Column */}
        <div className="left-column">
          <div className="add-player-section">
            <h2>Add New Player</h2>
            <div className="admin-form">
              <div className="form-group">
                <label>Player Name</label>
                <input
                  type="text"
                  className="admin-input"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter player name"
                  maxLength={16}
                />
              </div>
              <div className="form-group">
                <label>Deposit Amount (KES)</label>
                <input
                  type="number"
                  className="admin-input"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Math.max(10, Math.min(Number(e.target.value), remainingPool)))}
                  placeholder="Enter amount"
                  min={10}
                  max={remainingPool}
                />
              </div>
              <button className="admin-add-btn" onClick={handleAddPlayer}>
                + ADD PLAYER
              </button>
            </div>
            
            {pendingPlayer && (
              <div className="pending-code">
                <h3>Player Code</h3>
                <div className="code-display-container">
                  <div className="code-display">{pendingPlayer.playerId}</div>
                  <button 
                    className="copy-code-btn" 
                    onClick={() => copyToClipboard(pendingPlayer.playerId)}
                    title="Copy code to clipboard"
                  >
                    COPY
                  </button>
                </div>
                {copySuccess && <div className="copy-success">{copySuccess}</div>}
                <p className="code-hint">Give this code to the player to join</p>
              </div>
            )}
          </div>

          <div className="players-section">
            <h2>Active Players ({players.length})</h2>
            <div className="players-table">
              {players.length === 0 ? (
                <p className="no-players">No active players</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Balance</th>
                      <th>Withdrawn</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p) => (
                      <tr key={p.id}>
                        <td className="player-name">{p.name}</td>
                        <td className="player-balance">KES {p.balance?.toLocaleString() || "0"}</td>
                        <td className="withdraw-amount">KES {(p.withdrawnAmount || 0).toLocaleString()}</td>
                        <td>
                          <button className="remove-btn" onClick={() => handleRemovePlayer(p.id)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Withdrawals */}
        <div className="withdrawals-section">
          <h2>Recent Withdrawals ({withdrawals.length})</h2>
          <div className="withdrawals-table">
            {withdrawals.length === 0 ? (
              <p className="no-withdrawals">No withdrawals yet</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Amount</th>
                    <th>Total Withdrawn</th>
                    <th>Time</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td className="player-name">{w.playerName}</td>
                      <td className="withdraw-amount">KES {w.amount.toLocaleString()}</td>
                      <td className="withdraw-total">KES {(w.totalWithdrawn || w.amount).toLocaleString()}</td>
                      <td className="withdraw-time">{w.timestamp}</td>
                      <td>
                        <button 
                          className="delete-withdrawal-btn" 
                          onClick={() => handleDeleteWithdrawal(w.id)}
                          title="Delete withdrawal record"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {notification && (
        <div className={`admin-toast toast-${notification.type}`}>
          {notification.msg}
        </div>
      )}
    </div>
  );
}