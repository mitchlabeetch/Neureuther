// Ref to always call the latest onResult without stale closure
// Winner computed at trigger time, stored in ref for setTimeout
// ── Compute winner NOW from CURRENT segments ──
/* Arrow */
/* Wheel SVG */
/* Center clickable spin button */
import { useState, useRef, useEffect } from "react";

async function haptic(type: 'light' | 'medium' | 'heavy' = 'medium') {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const style = type === 'light' ? ImpactStyle.Light : type === 'heavy' ? ImpactStyle.Heavy : ImpactStyle.Medium;
    await Haptics.impact({ style });
  } catch {
    // Haptics not available (web browser)
  }
}

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
}

const SEGMENT_COLORS = [
  "#FDA172",
  "#FF6B6B",
  "#A78BFA",
  "#69D2A6",
  "#FBBF24",
  "#FB7185",
  "#38BDF8",
  "#A3E635"
];

export interface WheelSegment {
  label: string;
  color: string;
  emoji?: string;
}

interface SpinWheelProps {
  segments: WheelSegment[];
  onResult: (index: number, label: string) => void;
}

export function SpinWheel(
  {
    segments,
    onResult
  }: SpinWheelProps
) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const winnerRef = useRef<{
    index: number;
    label: string;
  } | null>(null);

  const spin = () => {
    if (spinning || segments.length < 2) return;

    const spins = 5 + Math.floor(Math.random() * 5);
    const extraAngle = Math.random() * 360;
    const totalRotation = rotation + spins * 360 + extraAngle;

    const segmentAngle = 360 / segments.length;
    const finalAngle = (rotation + extraAngle) % 360;
    const targetAngle = (360 - (finalAngle % 360)) % 360;
    const winnerIndex = Math.floor(targetAngle / segmentAngle);

    winnerRef.current = {
      index: winnerIndex,
      label: segments[winnerIndex]?.label ?? ""
    };

    setSpinning(true);
    setRotation(totalRotation);
    haptic('heavy');

    setTimeout(() => {
      setSpinning(false);
      const w = winnerRef.current;

      if (w) {
        onResultRef.current(w.index, w.label);
      }

      const pieces: ConfettiPiece[] = [];

      for (let i = 0; i < 30; i++) {
        pieces.push({
          id: i,
          x: Math.random() * 100,
          color: SEGMENT_COLORS[Math.floor(Math.random() * SEGMENT_COLORS.length)],
          delay: Math.random() * 0.3,
          size: 6 + Math.random() * 8
        });
      }

      setConfetti(pieces);
      setTimeout(() => setConfetti([]), 2500);
    }, 3500);
  };

  const svgSize = 300;
  const center = svgSize / 2;
  const radius = svgSize / 2 - 8;
  const segmentAngle = 360 / segments.length;

  const polarToCartesian = (angle: number, r: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;

    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad)
    };
  };

  return (
    <div className="relative flex flex-col items-center">
      {confetti.map(p => (<div
        key={p.id}
        className="confetti-piece"
        style={{
          left: `${p.x}%`,
          top: 0,
          backgroundColor: p.color,
          width: p.size,
          height: p.size,
          animationDelay: `${p.delay}s`
        }} />))}
      <div className="relative mt-3">
        {/* Arrow */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
          <svg width={32} height={32} viewBox="0 0 32 32">
            <polygon points="16,28 4,4 28,4" fill="#171e19" />
          </svg>
        </div>
        {/* Wheel SVG */}
        <svg width={svgSize} height={svgSize} className="drop-shadow-xl mt-3">
          <g
            style={{
              transformOrigin: `${center}px ${center}px`,
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? "transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
                : "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
            }}>
            {segments.map((seg, i) => {
              const startAngle = i * segmentAngle;
              const endAngle = startAngle + segmentAngle;
              const start = polarToCartesian(startAngle, radius);
              const end = polarToCartesian(endAngle, radius);
              const largeArc = segmentAngle > 180 ? 1 : 0;

              const pathData = [
                `M ${center} ${center}`,
                `L ${start.x} ${start.y}`,
                `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
                "Z"
              ].join(" ");

              const midAngle = startAngle + segmentAngle / 2;
              const labelPos = polarToCartesian(midAngle, radius * 0.65);

              return (
                <g key={`${seg.label}-${i}`}>
                  <path d={pathData} fill={seg.color} stroke="white" strokeWidth={2} />
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs font-extrabold fill-white select-none pointer-events-none"
                    style={{
                      fontSize: 11,
                      textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                    }}>
                    {seg.emoji ? `${seg.emoji} ` : ""}{seg.label}
                  </text>
                </g>
              );
            })}
          </g>
          {/* Center clickable spin button */}
          <g
            onClick={spin}
            className="cursor-pointer active:scale-90 transition-transform duration-150 origin-center hover:brightness-110"
            style={{
              cursor: spinning ? "default" : "pointer"
            }}>
            <circle
              cx={center}
              cy={center}
              r={34}
              fill="white"
              stroke="#171e19"
              strokeWidth={3} />
            <circle cx={center} cy={center} r={26} fill="#ca0013" />
            <text
              x={center}
              y={center + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-white font-extrabold select-none pointer-events-none"
              style={{
                fontSize: 14
              }}>SPIN
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
