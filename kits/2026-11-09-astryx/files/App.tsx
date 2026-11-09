import { useState } from 'react'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { HStack, VStack } from '@astryxdesign/core/Layout'
import { Selector } from '@astryxdesign/core/Selector'
import { Switch } from '@astryxdesign/core/Switch'
import { Table, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'

type Status = 'Published' | 'Draft' | 'Scheduled'

interface Video extends Record<string, unknown> {
  id: string
  title: string
  views: string
  status: Status
}

const metrics = [
  { label: 'Views', value: '48.2K', change: '+12%' },
  { label: 'Subscribers', value: '3,140', change: '+4%' },
  { label: 'Watch hours', value: '1,205', change: '-3%' },
]

const videos: Video[] = [
  { id: '1', title: 'I Tried Every Budget Mic So You Don’t Have To', views: '18,420', status: 'Published' },
  { id: '2', title: 'My Honest 2026 Studio Tour', views: '12,905', status: 'Published' },
  { id: '3', title: 'Editing Workflow in 10 Minutes', views: '9,311', status: 'Published' },
  { id: '4', title: 'Viewer Q&A: Your Brutal Questions', views: '—', status: 'Scheduled' },
  { id: '5', title: 'Channel Update (Rough Cut)', views: '—', status: 'Draft' },
]

const statusVariant = { Published: 'green', Scheduled: 'blue', Draft: 'neutral' } as const

const columns: TableColumn<Video>[] = [
  { key: 'title', header: 'Title', width: proportional(3) },
  { key: 'views', header: 'Views', width: proportional(1) },
  {
    key: 'status',
    header: 'Status',
    width: proportional(1),
    renderCell: (row) => <Badge variant={statusVariant[row.status]} label={row.status} />,
  },
]

const visibilityOptions = [
  { value: 'public', label: 'Public' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'private', label: 'Private' },
]

export default function App() {
  const [weekly, setWeekly] = useState(true)
  const [visibility, setVisibility] = useState('public')

  return (
    <VStack gap={6} padding={6}>
      <HStack justify="between" align="center">
        <Heading level={1}>Brutal Guy</Heading>
        <Button variant="primary" label="Upload video" />
      </HStack>

      <HStack gap={4}>
        {metrics.map((m) => (
          <Card key={m.label} style={{ flex: 1 }}>
            <VStack gap={1}>
              <Text type="supporting">{m.label}</Text>
              <Text type="display-3">{m.value}</Text>
              <Text type="supporting">{m.change}</Text>
            </VStack>
          </Card>
        ))}
      </HStack>

      <VStack gap={3}>
        <Heading level={2}>Recent videos</Heading>
        <Table data={videos} columns={columns} idKey="id" hasHover />
      </VStack>

      <Card>
        <VStack gap={4}>
          <Heading level={2}>Settings</Heading>
          <Switch
            label="Email me weekly stats"
            value={weekly}
            onChange={setWeekly}
            labelPosition="start"
            labelSpacing="spread"
          />
          <Selector
            label="Default visibility"
            options={visibilityOptions}
            value={visibility}
            onChange={setVisibility}
          />
        </VStack>
      </Card>
    </VStack>
  )
}
