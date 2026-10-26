"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { ChartPoint } from "@/lib/progress";
import styles from "./LineChart.module.css";

type LineChartProps = {
  label: string;
  unit: string;
  points: ChartPoint[];
  // Every chart on a page shares one date range, so the same date sits at the same x in each.
  firstDate: string;
  lastDate: string;
};

type Series = { name: string; color: string };

type PlacedPoint = ChartPoint & { x: number; y: number; color: string };

const height = 200;
const margin = { top: 12, right: 16, bottom: 28, left: 40 };
const plotHeight = height - margin.top - margin.bottom;

// Used until the chart has measured the space it actually has.
const defaultWidth = 360;

// Roughly how much width each date label on the x axis needs.
const pixelsPerDateTick = 90;
const valueTickCount = 4;

// The number of colours in LineChart.module.css; series past these all share the muted colour.
const seriesColorCount = 8;

const noBand = "No band";

// Keeps the tooltip, which is centred on its point, from running off either edge.
const tooltipHalfWidth = 70;

const msPerDay = 24 * 60 * 60 * 1000;

const dateLabel = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });

// Days since 1970 for a YYYY-MM-DD date, which Date.parse reads as UTC midnight.
function dayNumber(date: string): number {
  return Date.parse(date) / msPerDay;
}

function formatDay(day: number): string {
  return dateLabel.format(new Date(day * msPerDay));
}

// A tick spacing of 1, 2 or 5 times a power of ten that gives about `count` ticks across `range`.
function niceStep(range: number, count: number): number {
  const roughStep = range / count;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const scaled = roughStep / magnitude;
  if (scaled <= 1) {
    return magnitude;
  }
  if (scaled <= 2) {
    return 2 * magnitude;
  }
  if (scaled <= 5) {
    return 5 * magnitude;
  }
  return 10 * magnitude;
}

function valueTicks(values: number[]): number[] {
  let lowest = Math.min(...values);
  let highest = Math.max(...values);
  // A flat line still needs a range to sit in the middle of.
  if (lowest === highest) {
    lowest = lowest - 1;
    highest = highest + 1;
  }
  const step = niceStep(highest - lowest, valueTickCount);
  const first = Math.floor(lowest / step) * step;
  const last = Math.ceil(highest / step) * step;
  const ticks: number[] = [];
  for (let tick = first; tick <= last + step / 2; tick += step) {
    // Rounding keeps steps like 0.1 from piling up float error (0.30000000000000004).
    ticks.push(Number(tick.toFixed(6)));
  }
  return ticks;
}

function seriesName(point: ChartPoint): string {
  return point.series ?? noBand;
}

// Each series keeps the colour of the order it first appears in, so a band's colour never depends on the others.
function seriesList(points: ChartPoint[]): Series[] {
  const list: Series[] = [];
  for (const point of points) {
    const name = seriesName(point);
    const seen = list.some((series) => series.name === name);
    if (seen) {
      continue;
    }
    let color = "var(--muted)";
    if (list.length < seriesColorCount) {
      color = `var(--series-${list.length + 1})`;
    }
    list.push({ name, color });
  }
  return list;
}

// Consecutive points that share a series, each drawn as one line in its colour.
function runsOf(points: PlacedPoint[]): PlacedPoint[][] {
  const runs: PlacedPoint[][] = [];
  for (const point of points) {
    const currentRun = runs.at(-1);
    if (currentRun !== undefined && seriesName(currentRun[0]) === seriesName(point)) {
      currentRun.push(point);
    } else {
      runs.push([point]);
    }
  }
  return runs;
}

function linePath(points: PlacedPoint[]): string {
  const commands = points.map((point, index) => {
    const command = index === 0 ? "M" : "L";
    return `${command}${point.x},${point.y}`;
  });
  return commands.join(" ");
}

function formatValue(point: ChartPoint, unit: string): string {
  const prefix = point.approximate ? "~" : "";
  return `${prefix}${point.value} ${unit}`;
}

export function LineChart({ label, unit, points, firstDate, lastDate }: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(defaultWidth);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    const observer = new ResizeObserver(() => setWidth(container.clientWidth));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  if (points.length === 0) {
    return <p>Nothing logged yet.</p>;
  }

  const plotWidth = width - margin.left - margin.right;
  const firstDay = dayNumber(firstDate);
  const lastDay = dayNumber(lastDate);
  // A single day still needs a range to sit in the middle of.
  const daySpan = Math.max(lastDay - firstDay, 1);

  const ticks = valueTicks(points.map((point) => point.value));
  const lowestTick = ticks[0];
  const highestTick = ticks[ticks.length - 1];

  function xFor(day: number): number {
    return margin.left + ((day - firstDay) / daySpan) * plotWidth;
  }

  function yFor(value: number): number {
    const share = (value - lowestTick) / (highestTick - lowestTick);
    return margin.top + plotHeight - share * plotHeight;
  }

  const series = seriesList(points);
  const placedPoints: PlacedPoint[] = points.map((point) => {
    const pointSeries = series.find((entry) => entry.name === seriesName(point));
    return {
      ...point,
      x: xFor(dayNumber(point.date)),
      y: yFor(point.value),
      color: pointSeries?.color ?? "var(--muted)",
    };
  });
  const runs = runsOf(placedPoints);
  // A legend only says something when at least one point has a band.
  const showLegend = points.some((point) => point.series !== null);

  const dateTickCount = Math.max(Math.floor(plotWidth / pixelsPerDateTick), 1);
  const dateTicks: number[] = [];
  for (let index = 0; index <= dateTickCount; index++) {
    dateTicks.push(firstDay + (daySpan * index) / dateTickCount);
  }

  // Hovering anywhere over the plot picks the point nearest the pointer's date.
  function showNearest(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - bounds.left;
    let nearestIndex = 0;
    placedPoints.forEach((point, index) => {
      const distance = Math.abs(point.x - pointerX);
      const nearestDistance = Math.abs(placedPoints[nearestIndex].x - pointerX);
      if (distance < nearestDistance) {
        nearestIndex = index;
      }
    });
    setActiveIndex(nearestIndex);
  }

  let activePoint: PlacedPoint | null = null;
  if (activeIndex !== null && activeIndex < placedPoints.length) {
    activePoint = placedPoints[activeIndex];
  }

  return (
    <div className={styles.chart}>
      {showLegend && (
        <ul className={styles.legend}>
          {series.map((entry) => (
            <li key={entry.name} className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: entry.color }} />
              {entry.name}
            </li>
          ))}
        </ul>
      )}

      <div ref={containerRef} className={styles.plot}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          onPointerMove={showNearest}
          onPointerLeave={() => setActiveIndex(null)}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line className={styles.grid} x1={margin.left} x2={width - margin.right} y1={yFor(tick)} y2={yFor(tick)} />
              <text className={styles.valueTick} x={margin.left - 6} y={yFor(tick)}>
                {tick}
              </text>
            </g>
          ))}
          {dateTicks.map((day) => (
            <text key={day} className={styles.dateTick} x={xFor(day)} y={height - 8}>
              {formatDay(day)}
            </text>
          ))}

          {/* A band change joins the two runs with a thin neutral line, so the colour change is the band change. */}
          {runs.slice(1).map((run, index) => {
            const previousRun = runs[index];
            const from = previousRun[previousRun.length - 1];
            const to = run[0];
            return <line key={to.date} className={styles.connector} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
          })}
          {runs.map((run) => (
            <path key={run[0].date} className={styles.line} d={linePath(run)} stroke={run[0].color} />
          ))}

          {activePoint !== null && (
            <line
              className={styles.crosshair}
              x1={activePoint.x}
              x2={activePoint.x}
              y1={margin.top}
              y2={margin.top + plotHeight}
            />
          )}
          {placedPoints.map((point) => {
            const radius = point === activePoint ? 6 : 4;
            return (
              <circle key={point.date} className={styles.dot} cx={point.x} cy={point.y} r={radius} fill={point.color} />
            );
          })}
        </svg>

        {activePoint !== null && (
          <div
            className={styles.tooltip}
            style={{
              left: Math.min(Math.max(activePoint.x, tooltipHalfWidth), width - tooltipHalfWidth),
              top: activePoint.y,
            }}
          >
            <strong>{formatValue(activePoint, unit)}</strong>
            <span>{formatDay(dayNumber(activePoint.date))}</span>
            {showLegend && <span>{seriesName(activePoint)}</span>}
          </div>
        )}
      </div>

      <details>
        <summary>Data</summary>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>{unit}</th>
              {showLegend && <th>Band</th>}
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.date}>
                <td>{point.date}</td>
                <td>{formatValue(point, unit)}</td>
                {showLegend && <td>{seriesName(point)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
