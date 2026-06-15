const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { generateCrashPoint } = require("./gameEngine");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Configure CORS for production
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://chemasebet-crash.vercel.app",
      "https://chemasebet-crash.onrender.com"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

let gameState = "waiting";
let multiplier = 1.0;
let crashPoint = generateCrashPoint();
let roundId = 0;
let roundInterval = null;
let roundStartTime = null;
let history = [];
let countdownInterval = null;
let currentCountdown = 5;
let remainingPool = 100000;
const TOTAL_POOL = 100000;

const players = new Map();
const pendingPlayerJoins = new Map();
const withdrawals = [];

function getPublicPlayers() {
  return Array.from(players.entries()).map(([id, p]) => ({
    id,
    name: p.name,
    balance: p.balance,
    withdrawnAmount: p.withdrawnAmount || 0,
  }));
}

function broadcastPlayers() {
  io.emit("players", getPublicPlayers());
  io.emit("poolUpdate", { remainingPool });
}

function startCountdown() {
  gameState = "waiting";
  currentCountdown = 5;
  
  console.log("==========================================");
  console.log(`[ROUND ${roundId + 1}] Starting countdown: 5`);
  console.log("==========================================");
  io.emit("waiting", { countdown: currentCountdown, roundId });
  
  countdownInterval = setInterval(() => {
    currentCountdown--;
    console.log(`[COUNTDOWN] ${currentCountdown}`);
    io.emit("waiting", { countdown: currentCountdown, roundId });
    
    if (currentCountdown <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      startRound();
    }
  }, 1000);
}

function startRound() {
  gameState = "running";
  multiplier = 1.0;
  crashPoint = generateCrashPoint();
  roundId++;
  roundStartTime = Date.now();

  console.log("==========================================");
  console.log(`[ROUND ${roundId}] STARTED! Crash point: ${crashPoint}x`);
  console.log("==========================================");

  for (const [id, p] of players) {
    if (p.pendingBet1 > 0) {
      p.activeBet1 = p.pendingBet1;
      p.pendingBet1 = 0;
      p.hasCashedOut1 = false;
      console.log(`[ACTIVATION] ${p.name} BET 1 ACTIVATED: KES ${p.activeBet1}`);
      io.to(id).emit("betActivated", {
        activeBet1: p.activeBet1,
        activeBet2: p.activeBet2,
        newBalance: p.balance
      });
    }
    
    if (p.pendingBet2 > 0) {
      p.activeBet2 = p.pendingBet2;
      p.pendingBet2 = 0;
      p.hasCashedOut2 = false;
      console.log(`[ACTIVATION] ${p.name} BET 2 ACTIVATED: KES ${p.activeBet2}`);
      io.to(id).emit("betActivated", {
        activeBet1: p.activeBet1,
        activeBet2: p.activeBet2,
        newBalance: p.balance
      });
    }
  }

  io.emit("roundStart", { roundId });
  broadcastPlayers();

  roundInterval = setInterval(() => {
    const elapsed = (Date.now() - roundStartTime) / 1000;
    multiplier = Number((Math.pow(1.07, elapsed * 1.2)).toFixed(2));
    
    if (multiplier > 20) multiplier = 20;

    io.emit("multiplier", { multiplier: multiplier.toFixed(2) });

    if (multiplier >= crashPoint) {
      endRound();
    }
  }, 100);
}

function endRound() {
  clearInterval(roundInterval);
  gameState = "crashed";

  history.unshift(Number(crashPoint));
  if (history.length > 20) history.pop();

  console.log("==========================================");
  console.log(`[ROUND ${roundId}] CRASHED at ${crashPoint}x`);
  console.log("==========================================");

  for (const [, p] of players) {
    if (p.activeBet1 > 0 && !p.hasCashedOut1) {
      console.log(`[LOSS] ${p.name} lost BET 1: KES ${p.activeBet1}`);
      p.activeBet1 = 0;
    }
    if (p.activeBet2 > 0 && !p.hasCashedOut2) {
      console.log(`[LOSS] ${p.name} lost BET 2: KES ${p.activeBet2}`);
      p.activeBet2 = 0;
    }
  }

  io.emit("crash", { crashPoint, history });
  broadcastPlayers();

  setTimeout(() => {
    startCountdown();
  }, 3000);
}

io.on("connection", (socket) => {
  console.log(`[CONNECTION] [+] Connected: ${socket.id}`);

  socket.emit("init", {
    gameState,
    multiplier: multiplier.toFixed(2),
    history,
    roundId,
    players: getPublicPlayers(),
    countdown: currentCountdown,
    remainingPool,
    withdrawals,
  });

  socket.on("joinGame", ({ name, deposit }) => {
    console.log(`[JOIN] Player joining: ${name} with KES ${deposit}`);
    
    if (deposit < 10) {
      socket.emit("error", { message: "Minimum deposit is KES 10" });
      return;
    }
    
    if (deposit > remainingPool) {
      socket.emit("error", { message: `Only KES ${remainingPool.toLocaleString()} remaining in pool` });
      return;
    }
    
    const playerBalance = Number(deposit);
    remainingPool = Number((remainingPool - deposit).toFixed(2));
    
    players.set(socket.id, {
      id: socket.id,
      name: name,
      balance: playerBalance,
      withdrawnAmount: 0,
      activeBet1: 0,
      activeBet2: 0,
      pendingBet1: 0,
      pendingBet2: 0,
      hasCashedOut1: false,
      hasCashedOut2: false,
    });
    
    console.log(`[JOIN] ${name} joined with balance KES ${playerBalance}, Pool: KES ${remainingPool}`);
    
    socket.emit("joinSuccess", { balance: playerBalance, name: name });
    broadcastPlayers();
  });

  socket.on("adminAddPlayer", ({ name, deposit }) => {
    console.log(`[ADMIN] Adding player: ${name} with KES ${deposit}`);
    
    if (!name || name.trim() === "") {
      socket.emit("error", { message: "Player name required" });
      return;
    }
    if (deposit < 10) {
      socket.emit("error", { message: "Minimum deposit is KES 10" });
      return;
    }
    if (deposit > remainingPool) {
      socket.emit("error", { message: `Only KES ${remainingPool.toLocaleString()} remaining in pool` });
      return;
    }
    
    const playerId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    pendingPlayerJoins.set(playerId, {
      name: name,
      deposit: deposit,
      timestamp: Date.now()
    });
    
    console.log(`[ADMIN] Player "${name}" is pending join. Code: ${playerId}`);
    socket.emit("playerPending", { name, deposit, playerId });
  });

  socket.on("claimPendingPlayer", ({ playerId }) => {
    const pendingPlayer = pendingPlayerJoins.get(playerId);
    if (!pendingPlayer) {
      socket.emit("error", { message: "Invalid or expired player code" });
      return;
    }
    
    const { name, deposit } = pendingPlayer;
    const playerBalance = Number(deposit);
    
    remainingPool = Number((remainingPool - playerBalance).toFixed(2));
    
    players.set(socket.id, {
      id: socket.id,
      name: name,
      balance: playerBalance,
      withdrawnAmount: 0,
      activeBet1: 0,
      activeBet2: 0,
      pendingBet1: 0,
      pendingBet2: 0,
      hasCashedOut1: false,
      hasCashedOut2: false,
    });
    
    console.log(`[CLAIM] ${name} claimed their account with balance KES ${playerBalance}`);
    
    pendingPlayerJoins.delete(playerId);
    
    socket.emit("joinSuccess", { balance: playerBalance, name: name });
    broadcastPlayers();
    io.emit("playerClaimed", { name });
  });

  socket.on("placeBet", ({ bet, betId }) => {
    const p = players.get(socket.id);
    if (!p) {
      socket.emit("error", { message: "Player not found" });
      return;
    }
    
    if (bet < 10) {
      socket.emit("error", { message: "Minimum bet is KES 10" });
      return;
    }
    
    const betAmount = Number(bet);
    
    if (p.balance < betAmount) {
      socket.emit("error", { message: "Insufficient balance" });
      return;
    }
    
    if (betId === 1) {
      if (p.activeBet1 > 0) {
        socket.emit("error", { message: "Bet 1 already active this round" });
        return;
      }
      if (p.pendingBet1 > 0) {
        socket.emit("error", { message: "Bet 1 already pending for next round" });
        return;
      }
      
      p.balance = Number((p.balance - betAmount).toFixed(2));
      
      if (gameState === "waiting") {
        p.activeBet1 = betAmount;
        p.hasCashedOut1 = false;
        console.log(`[BET] ${p.name} BET 1 ACTIVE: KES ${betAmount}`);
        socket.emit("betPlaced", { betId, amount: betAmount, newBalance: p.balance, active: true });
      } else {
        p.pendingBet1 = betAmount;
        console.log(`[BET] ${p.name} BET 1 PENDING: KES ${betAmount}`);
        socket.emit("betPlaced", { betId, amount: betAmount, newBalance: p.balance, active: false, pending: true });
      }
    } else if (betId === 2) {
      if (p.activeBet2 > 0) {
        socket.emit("error", { message: "Bet 2 already active this round" });
        return;
      }
      if (p.pendingBet2 > 0) {
        socket.emit("error", { message: "Bet 2 already pending for next round" });
        return;
      }
      
      p.balance = Number((p.balance - betAmount).toFixed(2));
      
      if (gameState === "waiting") {
        p.activeBet2 = betAmount;
        p.hasCashedOut2 = false;
        console.log(`[BET] ${p.name} BET 2 ACTIVE: KES ${betAmount}`);
        socket.emit("betPlaced", { betId, amount: betAmount, newBalance: p.balance, active: true });
      } else {
        p.pendingBet2 = betAmount;
        console.log(`[BET] ${p.name} BET 2 PENDING: KES ${betAmount}`);
        socket.emit("betPlaced", { betId, amount: betAmount, newBalance: p.balance, active: false, pending: true });
      }
    }
    
    broadcastPlayers();
  });

  socket.on("cashOut", ({ betId }) => {
    const p = players.get(socket.id);
    if (!p) {
      socket.emit("error", { message: "Player not found" });
      return;
    }
    if (gameState !== "running") {
      socket.emit("error", { message: "Can only cash out during round" });
      return;
    }
    
    let winnings = 0;
    
    if (betId === 1) {
      if (p.activeBet1 === 0) {
        socket.emit("error", { message: "Bet 1 has no active bet" });
        return;
      }
      if (p.hasCashedOut1) {
        socket.emit("error", { message: "Bet 1 already cashed out" });
        return;
      }
      winnings = Number((p.activeBet1 * multiplier).toFixed(2));
      p.balance = Number((p.balance + winnings).toFixed(2));
      p.hasCashedOut1 = true;
      p.activeBet1 = 0;
      console.log(`[CASHOUT] ${p.name} BET 1 at ${multiplier.toFixed(2)}x - Won KES ${winnings}`);
    } else if (betId === 2) {
      if (p.activeBet2 === 0) {
        socket.emit("error", { message: "Bet 2 has no active bet" });
        return;
      }
      if (p.hasCashedOut2) {
        socket.emit("error", { message: "Bet 2 already cashed out" });
        return;
      }
      winnings = Number((p.activeBet2 * multiplier).toFixed(2));
      p.balance = Number((p.balance + winnings).toFixed(2));
      p.hasCashedOut2 = true;
      p.activeBet2 = 0;
      console.log(`[CASHOUT] ${p.name} BET 2 at ${multiplier.toFixed(2)}x - Won KES ${winnings}`);
    }
    
    socket.emit("cashedOut", {
      multiplier: multiplier.toFixed(2),
      winnings: winnings,
      betId: betId,
      newBalance: p.balance
    });
    
    broadcastPlayers();
  });

  socket.on("withdraw", () => {
    const p = players.get(socket.id);
    if (p) {
      const withdrawAmount = p.balance;
      p.withdrawnAmount = (p.withdrawnAmount || 0) + withdrawAmount;
      
      console.log(`[WITHDRAW] ${p.name} withdrew KES ${withdrawAmount} (Total withdrawn: KES ${p.withdrawnAmount})`);
      
      withdrawals.unshift({
        id: Date.now(),
        playerName: p.name,
        amount: withdrawAmount,
        totalWithdrawn: p.withdrawnAmount,
        timestamp: new Date().toLocaleString(),
        roundId: roundId
      });
      
      if (withdrawals.length > 50) withdrawals.pop();
      
      remainingPool = Number((remainingPool + withdrawAmount).toFixed(2));
      players.delete(socket.id);
      broadcastPlayers();
      io.emit("poolUpdate", { remainingPool });
      io.emit("withdrawalRecorded", { 
        playerName: p.name, 
        amount: withdrawAmount,
        totalWithdrawn: p.withdrawnAmount,
        timestamp: new Date().toLocaleString()
      });
      socket.emit("withdrawSuccess");
    }
  });

  socket.on("deleteWithdrawal", ({ withdrawalId }) => {
    const index = withdrawals.findIndex(w => w.id === withdrawalId);
    if (index !== -1) {
      const deleted = withdrawals[index];
      console.log(`[ADMIN] Deleted withdrawal record for ${deleted.playerName} - KES ${deleted.amount}`);
      withdrawals.splice(index, 1);
      io.emit("withdrawalDeleted", { withdrawalId });
    }
  });

  socket.on("removePlayer", ({ playerId }) => {
    if (players.has(playerId)) {
      const p = players.get(playerId);
      remainingPool = Number((remainingPool + p.balance).toFixed(2));
      console.log(`[REMOVE] Removed player: ${p.name}, returned KES ${p.balance} to pool`);
      players.delete(playerId);
      broadcastPlayers();
      io.emit("poolUpdate", { remainingPool });
    }
  });

  socket.on("disconnect", () => {
    const p = players.get(socket.id);
    if (p) {
      console.log(`[DISCONNECT] ${p.name} disconnected`);
      remainingPool = Number((remainingPool + p.balance).toFixed(2));
      players.delete(socket.id);
      broadcastPlayers();
      io.emit("poolUpdate", { remainingPool });
    }
  });
});

const PORT = process.env.PORT || 5000;
startCountdown();

server.listen(PORT, () => {
  console.log("==========================================");
  console.log(`CHEMASEBET CRASH server running on port ${PORT}`);
  console.log("==========================================");
});