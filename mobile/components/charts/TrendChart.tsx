import { useMemo, useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import Svg, {
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { useThemeColors } from "@/constants/theme";

type TrendPoint = { month: string; target: number; achieved: number };
type ChartPoint = { x: number; y: number };

const HEIGHT = 260;
const MARGIN = { top: 8, right: 12, left: 28, bottom: 22 };

function monotoneSlopes(points: ChartPoint[]): number[] {
  const n = points.length;
  const slopes = new Array<number>(n).fill(0);
  const dx: number[] = [];
  const dy: number[] = [];
  const secant: number[] = [];

  for (let index = 0; index < n - 1; index += 1) {
    dx.push(points[index + 1].x - points[index].x);
    dy.push(points[index + 1].y - points[index].y);
    secant.push(dy[index] / (dx[index] || 1e-6));
  }

  slopes[0] = secant[0];
  slopes[n - 1] = secant[n - 2];

  for (let index = 1; index < n - 1; index += 1) {
    const left = secant[index - 1];
    const right = secant[index];
    slopes[index] = left * right <= 0 ? 0 : (left + right) / 2;
  }

  for (let index = 0; index < n - 1; index += 1) {
    if (secant[index] === 0) {
      slopes[index] = 0;
      slopes[index + 1] = 0;
      continue;
    }

    const leftScale = slopes[index] / secant[index];
    const rightScale = slopes[index + 1] / secant[index];
    const magnitude = leftScale * leftScale + rightScale * rightScale;
    if (magnitude > 9) {
      const scale = 3 / Math.sqrt(magnitude);
      slopes[index] = scale * leftScale * secant[index];
      slopes[index + 1] = scale * rightScale * secant[index];
    }
  }

  return slopes;
}

function monotoneLinePath(points: ChartPoint[]): string {
  const count = points.length;
  if (count === 0) return "";
  if (count === 1) return `M ${points[0].x} ${points[0].y}`;
  if (count === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const slopes = monotoneSlopes(points);
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < count - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const dx = (end.x - start.x) / 3;
    const cp1x = start.x + dx;
    const cp1y = start.y + slopes[index] * dx;
    const cp2x = end.x - dx;
    const cp2y = end.y - slopes[index + 1] * dx;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
  }

  return path;
}

function monotoneAreaPath(points: ChartPoint[], baseline: number): string {
  if (!points.length) return "";
  const last = points[points.length - 1];
  const first = points[0];
  return `${monotoneLinePath(points)} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const colors = useThemeColors();
  const [width, setWidth] = useState(0);

  const chart = useMemo(() => {
    if (!width || data.length === 0) return null;

    const chartW = width - MARGIN.left - MARGIN.right;
    const chartH = HEIGHT - MARGIN.top - MARGIN.bottom;
    const maxVal = Math.max(...data.map((entry) => Math.max(entry.target, entry.achieved)), 0.1);
    const xStep = data.length > 1 ? chartW / (data.length - 1) : 0;

    const achieved = data.map((entry, index) => ({
      x: MARGIN.left + index * xStep,
      y: MARGIN.top + chartH - (entry.achieved / maxVal) * chartH,
      label: entry.month,
    }));

    const target = data.map((entry, index) => ({
      x: MARGIN.left + index * xStep,
      y: MARGIN.top + chartH - (entry.target / maxVal) * chartH,
    }));

    const baseline = MARGIN.top + chartH;

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      y: MARGIN.top + chartH - ratio * chartH,
      label: `${(maxVal * ratio).toFixed(maxVal >= 10 ? 0 : 1)}M`,
    }));

    return { achieved, target, baseline, yTicks };
  }, [data, width]);

  function onLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={{ height: HEIGHT, width: "100%" }} onLayout={onLayout}>
      {chart && width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <LinearGradient id="achv" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#E30613" stopOpacity={0.35} />
              <Stop offset="100%" stopColor="#E30613" stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id="tgt" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#8E8E96" stopOpacity={0.18} />
              <Stop offset="100%" stopColor="#8E8E96" stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {chart.yTicks.map((tick) => (
            <Line
              key={tick.label}
              x1={MARGIN.left}
              y1={tick.y}
              x2={width - MARGIN.right}
              y2={tick.y}
              stroke={colors.border}
              strokeDasharray="3 6"
            />
          ))}

          {chart.yTicks.map((tick) => (
            <SvgText
              key={`label-${tick.label}`}
              x={MARGIN.left - 6}
              y={tick.y + 4}
              fontSize={11}
              fill={colors.text3}
              textAnchor="end"
            >
              {tick.label}
            </SvgText>
          ))}

          <Path d={monotoneAreaPath(chart.target, chart.baseline)} fill="url(#tgt)" />
          <Path
            d={monotoneLinePath(chart.target)}
            fill="none"
            stroke="#8E8E96"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />

          <Path d={monotoneAreaPath(chart.achieved, chart.baseline)} fill="url(#achv)" />
          <Path
            d={monotoneLinePath(chart.achieved)}
            fill="none"
            stroke="#E30613"
            strokeWidth={2.5}
          />

          {chart.achieved.map((point) => (
            <SvgText
              key={point.label}
              x={point.x}
              y={HEIGHT - 4}
              fontSize={11}
              fill={colors.text3}
              textAnchor="middle"
            >
              {point.label}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
