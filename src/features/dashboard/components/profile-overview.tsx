'use client'

import { FileWarning } from 'lucide-react'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useGetLinkedInStats } from '@/features/users/query/profile.query'

type ProfileViewerGrowthEntry = {
  period: string
  profileViewersGrowth?: number
  profileViewersCount?: number
  profileViewersGrowthPercent?: number
}

export function ProfileOverview() {
  const { data: linkedInStats } = useGetLinkedInStats()

  const growth = (linkedInStats?.profileViewerStats?.growth ??
    []) as ProfileViewerGrowthEntry[]

  const hasValidData = Array.isArray(growth) && growth.length > 0
  if (!hasValidData) {
    return (
      <div className='text-muted-foreground flex h-[350px] flex-col items-center justify-center'>
        <FileWarning className='mb-2 h-10 w-10' />
        <p className='text-center text-sm'>No data found for this profile</p>
      </div>
    )
  }

  const getIntervalData = () => {
    if (growth.length <= 9) return growth
    const interval = Math.ceil(growth.length / 12)
    return growth.filter((_, index) => index % interval === 0).slice(0, 12)
  }

  const intervalData = getIntervalData()

  const chartData = intervalData.map((entry) => ({
    name: new Date(entry.period).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    total:
      (typeof entry.profileViewersGrowth === 'number'
        ? entry.profileViewersGrowth
        : typeof entry.profileViewersCount === 'number'
          ? entry.profileViewersCount
          : 0) ?? 0,
  }))

  const maxValue = Math.max(...chartData.map((item) => item.total), 0)
  const yDomain: [number, number] = [0, maxValue * 1.2]

  return (
    <ResponsiveContainer width='100%' height={350}>
      <BarChart data={chartData} margin={{ bottom: 40 }}>
        <XAxis
          dataKey='name'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={({ x, y, payload }) => {
            const [month, day] = String(payload.value).split(' ')
            return (
              <g transform={`translate(${x},${y})`}>
                <text
                  x={0}
                  y={0}
                  dy={10}
                  textAnchor='middle'
                  fill='#888888'
                  fontSize={12}
                >
                  {month}
                </text>
                <text
                  x={0}
                  y={0}
                  dy={24}
                  textAnchor='middle'
                  fill='#888888'
                  fontSize={12}
                >
                  {day}
                </text>
              </g>
            )
          }}
        />
        <YAxis
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
          domain={yDomain}
          tick={{ fill: '#888888' }}
        />
        <Tooltip
          cursor={false}
          wrapperStyle={{ outline: 'none' }}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            color: '#111111',
          }}
          labelStyle={{ color: '#6b7280' }}
          itemStyle={{ color: '#111111' }}
          formatter={(value: number) => [
            new Intl.NumberFormat().format(value ?? 0),
            'Profile Viewers',
          ]}
          labelFormatter={(label: string) => label}
        />
        <Bar
          dataKey='total'
          fill='currentColor'
          radius={[4, 4, 0, 0]}
          className='fill-primary'
          animationDuration={2000}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
