import { useMemo, useState } from 'react';
import { NetWorthPoint, TimeframeOption } from '../types/breeze';
import { formatCurrency } from '../utils/formatters';

interface NetWorthChartProps {
  points: NetWorthPoint[];
  timeframe: TimeframeOption;
  onTimeframeChange: (tf: TimeframeOption) => void;
}

const TIMEFRAMES: TimeframeOption[] = ['1M', '3M', '6M', '1Y'];

export function NetWorthChart({
  points,
  timeframe,
  onTimeframeChange,
}: NetWorthChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 640;
  const height = 210;
  const padLeft = 14;
  const padRight = 14;
  const padTop = 20;
  const padBottom = 30;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  const { coords, linePath, areaPath } = useMemo(() => {
    if (points.length === 0) {
      return { coords: [], linePath: '', areaPath: '' };
    }
    const vals = points.map((p) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const spread = Math.max(max - min, 1);
    const paddedMin = min - spread * 0.14;
    const paddedMax = max + spread * 0.12;
    const range = Math.max(paddedMax - paddedMin, 1);

    const mapped = points.map((pt, i) => {
      const x =
        points.length === 1
          ? padLeft + chartWidth / 2
          : padLeft + (i / (points.length - 1)) * chartWidth;
      const y = padTop + chartHeight - ((pt.value - paddedMin) / range) * chartHeight;
      return { x, y, pt };
    });

    // Smooth cubic bezier curve through points
    let d = `M ${mapped[0].x.toFixed(2)} ${mapped[0].y.toFixed(2)}`;
    for (let i = 0; i < mapped.length - 1; i++) {
      const curr = mapped[i];
      const next = mapped[i + 1];
      const ctrlX = (curr.x + next.x) / 2;
      d += ` C ${ctrlX.toFixed(2)} ${curr.y.toFixed(2)}, ${ctrlX.toFixed(2)} ${next.y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
    }

    const last = mapped[mapped.length - 1];
    const first = mapped[0];
    const baseline = padTop + chartHeight;
    const area = `${d} L ${last.x.toFixed(2)} ${baseline.toFixed(2)} L ${first.x.toFixed(2)} ${baseline.toFixed(2)} Z`;

    return { coords: mapped, linePath: d, areaPath: area };
  }, [points, chartHeight, chartWidth]);

  const activeIndex =
    hoveredIndex !== null && hoveredIndex < coords.length
      ? hoveredIndex
      : coords.length - 1;
  const activeCoord = coords[activeIndex];
  const firstPoint = points[0];
  const activePoint = points[activeIndex];
  const periodDelta =
    firstPoint && activePoint ? activePoint.value - firstPoint.value : 0;
  const periodPct =
    firstPoint && firstPoint.value > 0
      ? (periodDelta / firstPoint.value) * 100
      : 0;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[14px] font-semibold text-[#181A1C] tabular-nums">
            {activePoint ? formatCurrency(activePoint.value) : '$0.00'}
          </span>
          <span className="text-[13px] font-medium text-[#00A24E] tabular-nums">
            {periodDelta >= 0 ? '+' : ''}
            {formatCurrency(periodDelta)} ({periodPct >= 0 ? '+' : ''}
            {periodPct.toFixed(2)}%)
          </span>
          <span className="text-[13px] text-[#66686D]">
            · {activePoint?.dateLabel}
          </span>
        </div>

        <div
          className="inline-flex items-center gap-1 p-1 rounded-full bg-[#F3F5F7]"
          role="tablist"
          aria-label="Net worth timeframe"
        >
          {TIMEFRAMES.map((tf) => {
            const isActive = tf === timeframe;
            return (
              <button
                key={tf}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTimeframeChange(tf)}
                className={`min-h-[32px] px-3.5 rounded-full text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#181A1C] text-[#FFFFFF]'
                    : 'text-[#66686D] hover:text-[#181A1C]'
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative w-full select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[180px] sm:h-[210px] overflow-visible"
          role="img"
          aria-label={`Net worth trend chart over ${timeframe}`}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="breezeAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00A24E" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#DBFCE1" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Subtle horizontal guide lines */}
          {[0.25, 0.5, 0.75].map((ratio) => {
            const y = padTop + chartHeight * ratio;
            return (
              <line
                key={ratio}
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke="#E2E4E7"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {areaPath && <path d={areaPath} fill="url(#breezeAreaGrad)" />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#00A24E"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {activeCoord && (
            <>
              <line
                x1={activeCoord.x}
                x2={activeCoord.x}
                y1={padTop}
                y2={padTop + chartHeight}
                stroke="#00A24E"
                strokeOpacity="0.35"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="7"
                fill="#DBFCE1"
              />
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="4.25"
                fill="#00A24E"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </>
          )}

          {/* X-axis labels */}
          {coords.map((coord, idx) => (
            <text
              key={coord.pt.label + idx}
              x={coord.x}
              y={height - 6}
              textAnchor={
                idx === 0
                  ? 'start'
                  : idx === coords.length - 1
                  ? 'end'
                  : 'middle'
              }
              className="fill-[#66686D] text-[11px] font-medium"
            >
              {coord.pt.label}
            </text>
          ))}

          {/* Interactive hover columns */}
          {coords.map((coord, idx) => {
            const colWidth = chartWidth / Math.max(coords.length, 1);
            return (
              <rect
                key={`hit-${idx}`}
                x={Math.max(0, coord.x - colWidth / 2)}
                y={0}
                width={colWidth}
                height={height}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onClick={() => setHoveredIndex(idx)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
