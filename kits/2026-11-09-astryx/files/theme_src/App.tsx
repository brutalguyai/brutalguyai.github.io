import { useState } from 'react'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { Selector } from '@astryxdesign/core/Selector'
import { Stack } from '@astryxdesign/core/Stack'
import { Switch } from '@astryxdesign/core/Switch'
import { Table } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'

interface Video extends Record<string, unknown> {
  id: number
  title: string
  views: string
  status: 'Published' | 'Draft' | 'Scheduled'
}

const metrics = [
  { label: 'Views', value: '48.2K', delta: '+12%', up: true },
  { label: 'Subscribers', value: '3,140', delta: '+4%', up: true },
  { label: 'Watch hours', value: '1,205', delta: '-3%', up: false },
]

const videos: Video[] = [
  { id: 1, title: 'I Quit My Job to Make Videos', views: '18,420', status: 'Published' },
  { id: 2, title: 'Brutal Honest Gear Review', views: '12,075', status: 'Published' },
  { id: 3, title: 'Q&A: Your Questions Answered', views: '9,310', status: 'Published' },
  { id: 4, title: 'Behind the Scenes: Studio Tour', views: '0', status: 'Scheduled' },
  { id: 5, title: 'Next Big Project (Rough Cut)', views: '0', status: 'Draft' },
]

const statusVariant = { Published: 'success', Scheduled: 'info', Draft: 'neutral' } as const

export default function App() {
  const [weekly, setWeekly] = useState(true)
  const [visibility, setVisibility] = useState('public')

  return (
    <Stack gap={6} padding={6}>
      <Stack direction="horizontal" gap={4} align="center" justify="between">
        <Heading level={1}>Brutal Guy</Heading>
        <Button variant="primary" label="Upload video" />
      </Stack>

      <Stack direction="horizontal" gap={4} wrap="wrap">
        {metrics.map((m) => (
          <Card key={m.label} width={260}>
            <Stack gap={1}>
              <Text type="supporting">{m.label}</Text>
              <Heading level={2}>{m.value}</Heading>
              <Badge variant={m.up ? 'success' : 'error'} label={m.delta} />
            </Stack>
          </Card>
        ))}
      </Stack>

      <Stack gap={2}>
        <Heading level={2}>Recent videos</Heading>
        <Table<Video>
          data={videos}
          idKey="id"
          columns={[
            { key: 'title', header: 'Title' },
            { key: 'views', header: 'Views', align: 'end' },
            {
              key: 'status',
              header: 'Status',
              renderCell: (row) => (
                <Badge variant={statusVariant[row.status]} label={row.status} />
              ),
            },
          ]}
        />
      </Stack>

      <Card>
        <Stack gap={4}>
          <Heading level={2}>Settings</Heading>
          <Switch label="Email me weekly stats" value={weekly} onChange={setWeekly} />
          <Selector
            label="Default visibility"
            value={visibility}
            onChange={setVisibility}
            options={[
              { value: 'public', label: 'Public' },
              { value: 'unlisted', label: 'Unlisted' },
              { value: 'private', label: 'Private' },
            ]}
          />
        </Stack>
      </Card>
    </Stack>
  )
}
