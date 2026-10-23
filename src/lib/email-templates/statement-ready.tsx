import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  start?: string
  end?: string
  count?: number
  url?: string
}

const StatementReadyEmail = ({ start, end, count, url }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Hisaab statement is ready to download</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>हिसाब · Hisaab</Heading>
        <Text style={text}>
          Your statement{start && end ? ` for ${start} to ${end}` : ''} is ready
          {typeof count === 'number' ? ` — ${count} confirmed records.` : '.'}
        </Text>
        {url && <Button href={url} style={button}>Download PDF statement</Button>}
        <Text style={small}>This link works for 7 days. You asked for this statement in Hisaab.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: StatementReadyEmail,
  subject: (d: Record<string, any>) => d['start'] && d['end'] ? `Your Hisaab statement: ${d['start']} to ${d['end']}` : 'Your Hisaab statement',
  displayName: 'Statement ready',
  previewData: { start: '2026-10-01', end: '2026-10-31', count: 18, url: 'https://hisaab-track.lovable.app' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '520px' }
const h1 = { color: '#E5446D', fontSize: '24px', margin: '0 0 20px' }
const text = { color: '#2A2B2A', fontSize: '15px', lineHeight: '24px', margin: '0 0 18px' }
const button = { backgroundColor: '#E5446D', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' }
const small = { color: '#706C61', fontSize: '13px', marginTop: '22px' }
