import { useEffect, useRef } from "react";

export default function CrashChart({ dataPoints, crashed, multiplier, gameState }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    // Set canvas dimensions
    const container = canvas.parentElement;
    canvas.width = container.clientWidth - 40;
    canvas.height = 240;
    
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    
    // Draw background
    ctx.fillStyle = "#14161c";
    ctx.fillRect(0, 0, W, H);

    if (!dataPoints || dataPoints.length < 2) {
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "14px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for next round...", W / 2, H / 2);
      return;
    }

    const maxMultiplier = Math.max(...dataPoints.map(d => d.y), 5);
    const maxX = dataPoints.length - 1;

    const mapX = (i) => 40 + (i / maxX) * (W - 80);
    const mapY = (v) => H - 35 - ((v - 1) / (maxMultiplier - 1)) * (H - 60);

    // Draw grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let mult = 1; mult <= Math.ceil(maxMultiplier); mult++) {
      const y = mapY(mult);
      if (y > 20 && y < H - 20) {
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(W - 20, y);
        ctx.stroke();
        
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillText(`${mult}.00x`, 8, y + 4);
      }
    }

    // Draw curve
    ctx.beginPath();
    ctx.strokeStyle = crashed ? "#ff3d5a" : "#00e676";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    dataPoints.forEach((point, index) => {
      const x = mapX(index);
      const y = mapY(point.y);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Fill under curve
    if (dataPoints.length > 1) {
      ctx.lineTo(mapX(dataPoints.length - 1), H - 35);
      ctx.lineTo(mapX(0), H - 35);
      ctx.closePath();
      
      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, crashed ? "rgba(255,61,90,0.15)" : "rgba(0,230,118,0.12)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw current dot
    if (!crashed && gameState === "running" && dataPoints.length > 0) {
      const lastPoint = dataPoints[dataPoints.length - 1];
      const dotX = mapX(dataPoints.length - 1);
      const dotY = mapY(lastPoint.y);
      
      ctx.beginPath();
      ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,230,118,0.2)";
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#00e676";
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }

    // Draw crash indicator
    if (crashed && dataPoints.length > 0) {
      const lastPoint = dataPoints[dataPoints.length - 1];
      const crashX = mapX(dataPoints.length - 1);
      const crashY = mapY(lastPoint.y);
      
      ctx.beginPath();
      ctx.arc(crashX, crashY, 15, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,61,90,0.25)";
      ctx.fill();
      
      ctx.strokeStyle = "#ff3d5a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(crashX - 10, crashY - 10);
      ctx.lineTo(crashX + 10, crashY + 10);
      ctx.moveTo(crashX + 10, crashY - 10);
      ctx.lineTo(crashX - 10, crashY + 10);
      ctx.stroke();
    }

  }, [dataPoints, crashed, gameState]);

  return (
    <canvas
      ref={canvasRef}
      style={{ 
        width: "100%", 
        height: "240px", 
        display: "block",
        backgroundColor: "#14161c",
        borderRadius: "8px"
      }}
    />
  );
}