import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
}

const WelcomeEmail = ({ name }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Hisaab account is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>हिसाब · Hisaab</Heading>
        <Text style={text}>{name ? `Namaste ${name},` : 'Namaste,'}</Text>
        <Text style={text}>
          Your Hisaab account is ready. Speak a bill, scan a parchi, or log a purchase order — your khata fills itself.
        </Text>
        <Text style={text}>Bill bhejo. हिसाब हो जाएगा।</Text>
        <Text style={footer}>— Team Hisaab</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Your Hisaab account is ready',
  displayName: 'Welcome',
  previewData: { name: 'Ramesh' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '520px' }
const h1 = { color: '#E5446D', fontSize: '24px', margin: '0 0 20px' }
const text = { color: '#2A2B2A', fontSize: '15px', lineHeight: '24px', margin: '0 0 14px' }
const footer = { color: '#706C61', fontSize: '13px', marginTop: '24px' }
