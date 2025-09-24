'use client'

import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import type { TooltipProps } from 'recharts'

import { cn } from '@/lib/utils'

/**
 * Minimal replacement for missing TooltipPayload type in recharts@3.2.1
 */
type TooltipPayload<ValueType = number, NameType = string> = {
  value?: ValueType
  name?: NameType
  color?: string
  dataKey?: string | number
  payload?: any
}

/**
 * Context for passing chart config
 */
const ChartContext = React.createContext<{
  config: Record<string, { label: string; color: string }>
}>({
  config: {},
})

export function ChartContainer({
  config,
  children,
  className,
}: {
  config: Record<string, { label: string; color: string }>
  children: React.ReactNode
  className?: string
}) {
  return (
    <ChartContext.Provider value={{ config }}>
      <div className={cn('w-full h-full', className)}>{children}</div>
    </ChartContext.Provider>
  )
}

export function useChart() {
  return React.useContext(ChartContext)
}

/**
 * Legend component
 */
export function ChartLegend({
  className,
  payload,
}: {
  className?: string
  payload?: TooltipPayload[]
}) {
  const { config } = useChart()

  if (!payload) return null

  return (
    <div className={cn('flex flex-wrap gap-4', className)}>
      {payload.map((entry, i) => {
        const item = config[entry.dataKey as string]
        return (
          <div key={`legend-item-${i}`} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item?.color ?? entry.color }}
            />
            <span className="text-sm">{item?.label ?? entry.value}</span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Props for custom tooltip content
 */
interface ChartTooltipContentProps extends TooltipProps<number, string> {
  className?: string
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: 'line' | 'dot' | 'dashed'
  nameKey?: string
  labelKey?: string
  payload?: TooltipPayload<number, string>[]
}

/**
 * Tooltip content component
 */
export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: ChartTooltipContentProps) {
  const { config } = useChart()

  if (!active || !payload?.length) return null

  const items = payload.map((entry, index) => {
    const item = config[entry.dataKey as string]
    const displayName = nameKey
      ? (entry.payload?.[nameKey] as string) ?? entry.name
      : entry.name

    return (
      <div key={`tooltip-item-${index}`} className="flex items-center gap-2">
        {!hideIndicator && (
          <span
            className={cn(
              'inline-block rounded-full',
              indicator === 'dot' && 'h-2 w-2',
              indicator === 'line' && 'h-0.5 w-4',
              indicator === 'dashed' && 'h-0.5 w-4 border-t border-dashed'
            )}
            style={{ backgroundColor: color ?? item?.color ?? entry.color }}
          />
        )}
        <span className="text-sm">{displayName}</span>
        <span className="ml-auto text-sm font-medium">
          {formatter ? formatter(entry.value, entry.name, entry, index) : entry.value}
        </span>
      </div>
    )
  })

  return (
    <div
      className={cn(
        'rounded-md border bg-background px-3 py-2 shadow-md',
        className
      )}
    >
      {!hideLabel && (
        <div className={cn('mb-1 text-sm font-semibold', labelClassName)}>
          {labelFormatter ? labelFormatter(label, payload) : label}
        </div>
      )}
      <div className="space-y-1">{items}</div>
    </div>
  )
}

// Export recharts primitives for convenience
export const {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} = RechartsPrimitive
