import { useId } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { paletteFromColor } from "@/lib/chartPalette";
import type { ChartType, LegendPosition } from "@/lib/chartSettings";

interface SeriesConfig {
  dataKey: string;
  name: string;
}

interface Props {
  type: ChartType;
  data: any[];
  xKey: string;
  series: SeriesConfig[];
  color: string;
  legend: LegendPosition;
  valueFormatter?: (v: number) => string;
  xAxisProps?: Record<string, unknown>;
  height?: number | `${number}%`;
}

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    borderColor: "hsl(var(--border))",
    color: "hsl(var(--foreground))",
  },
};

function legendProps(position: LegendPosition) {
  if (position === "interna") {
    return { layout: "vertical" as const, verticalAlign: "top" as const, align: "right" as const, wrapperStyle: { paddingLeft: 8, fontSize: 12 } };
  }
  if (position === "externa") {
    return { verticalAlign: "bottom" as const, align: "center" as const, wrapperStyle: { paddingTop: 8, fontSize: 12 } };
  }
  return { wrapperStyle: { fontSize: 12 } };
}

export default function FlexibleChart({
  type,
  data,
  xKey,
  series,
  color,
  legend,
  valueFormatter,
  xAxisProps,
  height = "100%",
}: Props) {
  const uid = useId().replace(/[:]/g, "");
  const palette = paletteFromColor(color, Math.max(data.length, series.length, 1));
  const lp = legendProps(legend);

  if (type === "pizza" || type === "rosca") {
    const single = series[0];
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey={single.dataKey}
            nameKey={xKey}
            cx="50%"
            cy="45%"
            innerRadius={type === "rosca" ? 55 : 0}
            outerRadius={80}
            paddingAngle={3}
            cornerRadius={6}
            animationDuration={600}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} className="stroke-background hover:opacity-80 transition-opacity" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} />
          <Legend {...lp} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "linha") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
          <XAxis dataKey={xKey} stroke="currentColor" fontSize={12} {...xAxisProps} />
          <YAxis stroke="currentColor" fontSize={12} tickFormatter={valueFormatter} />
          <Tooltip {...tooltipStyle} formatter={valueFormatter ? (v: number) => valueFormatter(v) : undefined} />
          {series.length > 1 && <Legend {...lp} />}
          {series.map((s, i) => (
            <Line key={s.dataKey} type="monotone" dataKey={s.dataKey} name={s.name} stroke={palette[i % palette.length]} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} animationDuration={600} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.dataKey} id={`${uid}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={palette[i % palette.length]} stopOpacity={0.35} />
                <stop offset="95%" stopColor={palette[i % palette.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
          <XAxis dataKey={xKey} stroke="currentColor" fontSize={12} {...xAxisProps} />
          <YAxis stroke="currentColor" fontSize={12} tickFormatter={valueFormatter} />
          <Tooltip {...tooltipStyle} formatter={valueFormatter ? (v: number) => valueFormatter(v) : undefined} />
          {series.length > 1 && <Legend {...lp} />}
          {series.map((s, i) => (
            <Area key={s.dataKey} type="monotone" dataKey={s.dataKey} name={s.name} stroke={palette[i % palette.length]} fill={`url(#${uid}-${i})`} strokeWidth={2.5} animationDuration={600} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // barras (default)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.dataKey} id={`${uid}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={palette[i % palette.length]} stopOpacity={0.95} />
              <stop offset="95%" stopColor={palette[i % palette.length]} stopOpacity={0.55} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
        <XAxis dataKey={xKey} stroke="currentColor" fontSize={12} {...xAxisProps} />
        <YAxis stroke="currentColor" fontSize={12} tickFormatter={valueFormatter} allowDecimals={false} />
        <Tooltip {...tooltipStyle} formatter={valueFormatter ? (v: number) => valueFormatter(v) : undefined} />
        {series.length > 1 && <Legend {...lp} />}
        {series.map((s, i) => (
          <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name} fill={`url(#${uid}-${i})`} radius={[8, 8, 0, 0]} className="transition-all duration-300 hover:opacity-80" animationDuration={600} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
