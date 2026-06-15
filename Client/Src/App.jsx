import { useEffect, useState, useCallback } from "react";
import io from "socket.io-client";
import CrashChart from "./components/CrashChart";
import "./index.css";

// Change this to your production URL when deployed
const SOCKET_URL = process.env.NODE_ENV === "production" 
  ? "https://your-backend-url.onrender.com" 
  : "http://localhost:5000";

const socket = io(SOCKET_URL);

function getMultiplierColor(m, crashed) {
  if (crashed) return "#ff3d5a";
  if (m >= 5) return "#ffd700";
  if (m >= 2) return "#00e676";
  return "#ffffff";
}

export default function App() {
  const [balance, setBalance] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [gameState, setGameState] = useState("waiting");
  const [activeBet1, setActiveBet1] = useState(false);
  const [activeBet2, setActiveBet2] = useState(false);
  const [pendingBet1, setPendingBet1] = useState(false);
  const [pendingBet2, setPendingBet2] = useState(false);
  const [currentBet1, setCurrentBet1] = useState(0);
  const [currentBet2, setCurrentBet2] = useState(0);
  const [betAmount1, setBetAmount1] = useState(100);
  const [betAmount2, setBetAmount2] = useState(100);
  const [history, setHistory] = useState([]);
  const [countdown, setCountdown] = useState(5);
  const [notification, setNotification] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [bet1Status, setBet1Status] = useState("ready");
  const [bet2Status, setBet2Status] = useState("ready");
  const [joinCode, setJoinCode] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const showNotification = useCallback((msg, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyPress = (e) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
      if (e.key === 'Escape' && document.fullscreenElement) {
        exitFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleWithdraw = () => {
    setNameSet(false);
    setPlayerName("");
    setBalance(0);
    setActiveBet1(false);
    setActiveBet2(false);
    setPendingBet1(false);
    setPendingBet2(false);
    setCurrentBet1(0);
    setCurrentBet2(0);
    setBet1Status("ready");
    setBet2Status("ready");
    setJoinCode("");
    showNotification("You have withdrawn. Enter a new code to play again!", "info");
    socket.emit("withdraw");
  };

  useEffect(() => {
    socket.on("init", ({ gameState, multiplier, history, countdown }) => {
      setGameState(gameState);
      setMultiplier(Number(multiplier));
      setHistory(history || []);
      setCountdown(countdown);
    });

    socket.on("waiting", ({ countdown }) => {
      setGameState("waiting");
      setChartData([]);
      setMultiplier(1.0);
      setCountdown(countdown);
    });

    socket.on("roundStart", () => {
      setGameState("running");
      setChartData([{ y: 1.0 }]);
    });

    socket.on("multiplier", ({ multiplier }) => {
      const m = Number(multiplier);
      setMultiplier(m);
      setChartData((prev) => [...prev, { y: m }]);
    });

    socket.on("crash", ({ crashPoint, history }) => {
      setGameState("crashed");
      setMultiplier(Number(crashPoint));
      setHistory(history || []);
      
      if (activeBet1 && currentBet1 > 0) {
        setBet1Status("lost");
        showNotification(`Bet 1 lost! KES ${currentBet1.toLocaleString()}`, "loss");
        setActiveBet1(false);
        setCurrentBet1(0);
        setPendingBet1(false);
      }
      if (activeBet2 && currentBet2 > 0) {
        setBet2Status("lost");
        showNotification(`Bet 2 lost! KES ${currentBet2.toLocaleString()}`, "loss");
        setActiveBet2(false);
        setCurrentBet2(0);
        setPendingBet2(false);
      }
    });

    socket.on("cashedOut", ({ multiplier, winnings, betId, newBalance }) => {
      const winAmount = parseFloat(winnings);
      
      setBalance(newBalance);
      
      if (betId === 1) {
        setActiveBet1(false);
        setCurrentBet1(0);
        setPendingBet1(false);
        setBet1Status("ready");
        showNotification(`Bet 1 cashed out at ${multiplier}x! +KES ${winAmount.toLocaleString()}`, "win");
      } else if (betId === 2) {
        setActiveBet2(false);
        setCurrentBet2(0);
        setPendingBet2(false);
        setBet2Status("ready");
        showNotification(`Bet 2 cashed out at ${multiplier}x! +KES ${winAmount.toLocaleString()}`, "win");
      }
    });

    socket.on("joinSuccess", ({ balance, name }) => {
      setBalance(balance);
      setPlayerName(name);
      setNameSet(true);
      showNotification(`Welcome ${name}! Your balance is KES ${balance.toLocaleString()}`, "win");
    });

    socket.on("betPlaced", ({ betId, amount, newBalance, active, pending }) => {
      setBalance(newBalance);
      
      if (betId === 1) {
        if (active) {
          setCurrentBet1(amount);
          setActiveBet1(true);
          setPendingBet1(false);
          setBet1Status("active");
          showNotification(`Bet 1 placed! KES ${amount.toLocaleString()}`, "info");
        } else if (pending) {
          setPendingBet1(true);
          setActiveBet1(false);
          setBet1Status("active");
          showNotification(`Bet 1 placed! Will start at 1.00x next round!`, "info");
        }
      } else if (betId === 2) {
        if (active) {
          setCurrentBet2(amount);
          setActiveBet2(true);
          setPendingBet2(false);
          setBet2Status("active");
          showNotification(`Bet 2 placed! KES ${amount.toLocaleString()}`, "info");
        } else if (pending) {
          setPendingBet2(true);
          setActiveBet2(false);
          setBet2Status("active");
          showNotification(`Bet 2 placed! Will start at 1.00x next round!`, "info");
        }
      }
    });

    socket.on("betActivated", ({ activeBet1, activeBet2, newBalance }) => {
      setBalance(newBalance);
      
      if (activeBet1 > 0) {
        setCurrentBet1(activeBet1);
        setActiveBet1(true);
        setPendingBet1(false);
        setBet1Status("active");
        showNotification(`Bet 1 ACTIVATED! KES ${activeBet1.toLocaleString()} at 1.00x`, "win");
      }
      
      if (activeBet2 > 0) {
        setCurrentBet2(activeBet2);
        setActiveBet2(true);
        setPendingBet2(false);
        setBet2Status("active");
        showNotification(`Bet 2 ACTIVATED! KES ${activeBet2.toLocaleString()} at 1.00x`, "win");
      }
    });

    socket.on("error", ({ message }) => {
      showNotification(message, "error");
    });

    socket.on("withdrawSuccess", () => {
      console.log("Withdraw confirmed by server");
    });

    return () => socket.removeAllListeners();
  }, [activeBet1, activeBet2, currentBet1, currentBet2, pendingBet1, pendingBet2, showNotification]);

  const handleJoinWithCode = () => {
    if (!joinCode.trim()) {
      showNotification("Please enter your player code", "error");
      return;
    }
    console.log(`Claiming player with code: ${joinCode}`);
    socket.emit("claimPendingPlayer", { playerId: joinCode });
    setJoinCode("");
  };

  const handlePlaceBet = (betNumber, amount) => {
    if (balance < amount) {
      showNotification(`Insufficient balance!`, "error");
      return;
    }
    
    if (betNumber === 1) {
      if (activeBet1) {
        showNotification("Bet 1 already active this round!", "error");
        return;
      }
      if (pendingBet1) {
        showNotification("Bet 1 already pending for next round!", "error");
        return;
      }
      socket.emit("placeBet", { bet: amount, betId: 1 });
    } else {
      if (activeBet2) {
        showNotification("Bet 2 already active this round!", "error");
        return;
      }
      if (pendingBet2) {
        showNotification("Bet 2 already pending for next round!", "error");
        return;
      }
      socket.emit("placeBet", { bet: amount, betId: 2 });
    }
  };

  const handleCashOut = (betNumber) => {
    if (betNumber === 1) {
      if (activeBet1) {
        socket.emit("cashOut", { betId: 1 });
      } else {
        showNotification("Bet 1 has no active bet to cash out", "error");
      }
    } else if (betNumber === 2) {
      if (activeBet2) {
        socket.emit("cashOut", { betId: 2 });
      } else {
        showNotification("Bet 2 has no active bet to cash out", "error");
      }
    }
  };

  const crashed = gameState === "crashed";
  const multColor = getMultiplierColor(multiplier, crashed);
  const isWaiting = gameState === "waiting";

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-text"><strong>CHEMASEBET CRASH</strong></span>
          <button className="fullscreen-btn" onClick={toggleFullscreen} title="Fullscreen (F11)">
            ⛶
          </button>
        </div>
        
        <div className="header-right">
          {!nameSet ? (
            <div className="join-code-small">
              <input
                type="text"
                className="join-code-input-small"
                placeholder="Enter unique code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinWithCode()}
              />
              <button className="join-code-btn-small" onClick={handleJoinWithCode}>
                Join
              </button>
            </div>
          ) : (
            <div className="balance-header">
              <span className="player-name-header">{playerName}</span>
              <div className="balance-box">
                <span className="balance-label-header">BALANCE</span>
                <span className="balance-value-header">KES {balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
              </div>
              <button className="withdraw-btn" onClick={handleWithdraw}>
                WITHDRAW
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="history-strip">
        <span className="history-title">Recent Crashes:</span>
        {history.map((pt, i) => (
          <span
            key={i}
            className={`history-pill ${pt < 1.5 ? "low" : pt >= 5 ? "high" : "mid"}`}
          >
            {pt.toFixed(2)}x
          </span>
        ))}
      </div>

      <main className="main">
        <div className="chart-wrapper">
          <CrashChart 
            dataPoints={chartData} 
            crashed={crashed} 
            multiplier={multiplier}
            gameState={gameState}
          />
          
          <div className={`multiplier-overlay ${crashed ? "crashed" : ""}`}>
            {isWaiting ? (
              <div className="countdown-display">
                <span className="countdown-label">Next round in</span>
                <span className="countdown-number">{countdown}</span>
              </div>
            ) : (
              <span className="multiplier-value" style={{ color: multColor }}>
                {multiplier.toFixed(2)}x
              </span>
            )}
          </div>
        </div>

        <div className="two-payouts-container">
          {/* BET 1 */}
          <div className={`payout-card ${bet1Status}`}>
            <div className="payout-header">
              <span className="payout-title">BET 1</span>
              {pendingBet1 && <span className="pending-badge">Next Round</span>}
            </div>
            
            <div className="bet-controls">
              <div className="bet-input-group">
                <label className="bet-label">Bet Amount</label>
                <div className="input-wrapper">
                  <span className="currency">KES</span>
                  <input
                    type="number"
                    className="bet-input-field"
                    value={betAmount1}
                    onChange={(e) => setBetAmount1(Math.max(10, Number(e.target.value)))}
                    disabled={activeBet1 || pendingBet1 || !nameSet}
                  />
                </div>
              </div>
              
              <div className="quick-bets-container">
                <div className="quick-bets-row top-row">
                  {[10, 20, 30, 40].map((amt) => (
                    <button
                      key={amt}
                      className="quick-bet-btn"
                      onClick={() => setBetAmount1(amt)}
                      disabled={activeBet1 || pendingBet1 || !nameSet}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
                <div className="quick-bets-row bottom-row">
                  {[50, 100, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      className="quick-bet-btn"
                      onClick={() => setBetAmount1(amt)}
                      disabled={activeBet1 || pendingBet1 || !nameSet}
                    >
                      {amt >= 1000 ? `${amt/1000}K` : amt}
                    </button>
                  ))}
                </div>
                <button
                  className="max-bet-btn"
                  onClick={() => setBetAmount1(balance)}
                  disabled={activeBet1 || pendingBet1 || !nameSet}
                >
                  MAX
                </button>
              </div>
            </div>
            
            {!activeBet1 && !pendingBet1 ? (
              <button
                className={`action-bet-btn ${!nameSet ? "disabled" : ""}`}
                onClick={() => handlePlaceBet(1, betAmount1)}
                disabled={!nameSet || balance < betAmount1}
              >
                PLACE BET 1 — KES {betAmount1.toLocaleString()}
              </button>
            ) : activeBet1 ? (
              <button
                className="cashout-bet-btn"
                onClick={() => handleCashOut(1)}
              >
                CASH OUT @ {multiplier.toFixed(2)}x — KES {(currentBet1 * multiplier).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </button>
            ) : (
              <button className="action-bet-btn disabled" disabled>
                PLEASE WAIT - NEXT ROUND
              </button>
            )}
          </div>

          {/* BET 2 */}
          <div className={`payout-card ${bet2Status}`}>
            <div className="payout-header">
              <span className="payout-title">BET 2</span>
              {pendingBet2 && <span className="pending-badge">Next Round</span>}
            </div>
            
            <div className="bet-controls">
              <div className="bet-input-group">
                <label className="bet-label">Bet Amount</label>
                <div className="input-wrapper">
                  <span className="currency">KES</span>
                  <input
                    type="number"
                    className="bet-input-field"
                    value={betAmount2}
                    onChange={(e) => setBetAmount2(Math.max(10, Number(e.target.value)))}
                    disabled={activeBet2 || pendingBet2 || !nameSet}
                  />
                </div>
              </div>
              
              <div className="quick-bets-container">
                <div className="quick-bets-row top-row">
                  {[10, 20, 30, 40].map((amt) => (
                    <button
                      key={amt}
                      className="quick-bet-btn"
                      onClick={() => setBetAmount2(amt)}
                      disabled={activeBet2 || pendingBet2 || !nameSet}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
                <div className="quick-bets-row bottom-row">
                  {[50, 100, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      className="quick-bet-btn"
                      onClick={() => setBetAmount2(amt)}
                      disabled={activeBet2 || pendingBet2 || !nameSet}
                    >
                      {amt >= 1000 ? `${amt/1000}K` : amt}
                    </button>
                  ))}
                </div>
                <button
                  className="max-bet-btn"
                  onClick={() => setBetAmount2(balance)}
                  disabled={activeBet2 || pendingBet2 || !nameSet}
                >
                  MAX
                </button>
              </div>
            </div>
            
            {!activeBet2 && !pendingBet2 ? (
              <button
                className={`action-bet-btn ${!nameSet ? "disabled" : ""}`}
                onClick={() => handlePlaceBet(2, betAmount2)}
                disabled={!nameSet || balance < betAmount2}
              >
                PLACE BET 2 — KES {betAmount2.toLocaleString()}
              </button>
            ) : activeBet2 ? (
              <button
                className="cashout-bet-btn"
                onClick={() => handleCashOut(2)}
              >
                CASH OUT @ {multiplier.toFixed(2)}x — KES {(currentBet2 * multiplier).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </button>
            ) : (
              <button className="action-bet-btn disabled" disabled>
                PLEASE WAIT - NEXT ROUND
              </button>
            )}
          </div>
        </div>
      </main>

      {notification && (
        <div className={`toast toast-${notification.type}`}>
          {notification.msg}
        </div>
      )}
    </div>
  );
}