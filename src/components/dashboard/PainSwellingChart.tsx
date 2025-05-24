"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { DailyLog } from "@/types"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { format } from "date-fns";

interface PainSwellingChartProps {
  logs: DailyLog[];
}

export default function PainSwellingChart({ logs }: PainSwellingChartProps) {
  const chartData = logs.map(log => ({
    date: format(new Date(log.date + "T00:00:00"), "MMM d"), // Ensure date is parsed correctly
    painLevel: log.painLevel,
    swellingLevel: log.swellingLevel,
  }));

  const chartConfig = {
    painLevel: {
      label: "Pain Level",
      color: "hsl(var(--chart-1))",
    },
    swellingLevel: {
      label: "Swelling Level",
      color: "hsl(var(--chart-2))",
    },
  }

  if (logs.length === 0) {
    return <p className="text-muted-foreground text-center py-10">Not enough data to display chart. Keep logging your progress!</p>;
  }
  
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full aspect-video">
      <LineChart
        accessibilityLayer
        data={chartData}
        margin={{
          top: 20,
          left: 12,
          right: 12,
          bottom:5,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value.slice(0, 6)} // Shorten date display if needed
        />
        <YAxis 
          domain={[0, 10]} 
          tickCount={6} 
          allowDecimals={false}
          tickMargin={8}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <Legend content={<ChartLegendContent />} />
        <Line
          dataKey="painLevel"
          type="monotone"
          stroke="var(--color-painLevel)"
          strokeWidth={2}
          dot={{
            fill: "var(--color-painLevel)",
          }}
          activeDot={{
            r: 6,
          }}
        />
        <Line
          dataKey="swellingLevel"
          type="monotone"
          stroke="var(--color-swellingLevel)"
          strokeWidth={2}
          dot={{
            fill: "var(--color-swellingLevel)",
          }}
          activeDot={{
            r: 6,
          }}
        />
      </LineChart>
    </ChartContainer>
  )
}
