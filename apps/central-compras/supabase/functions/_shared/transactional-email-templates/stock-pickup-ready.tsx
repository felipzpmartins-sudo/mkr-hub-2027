import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Central de Compras"

interface Props {
  requesterName?: string
  itemsSummary?: string
  allocationLocation?: string
  solicitationId?: string
}

const StockPickupReadyEmail = ({ requesterName, itemsSummary, allocationLocation, solicitationId }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Nova requisição liberada para retirada no estoque - {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={h1}>📦 Requisição Liberada para Retirada</Heading>
        </Section>
        <Hr style={hr} />
        <Text style={text}>
          Uma requisição de produtos internos foi aprovada e está pronta para retirada no estoque.
        </Text>
        <Section style={detailsBox}>
          <Text style={detailLabel}>Solicitante:</Text>
          <Text style={detailValue}>{requesterName || 'Não informado'}</Text>
          {itemsSummary ? (<>
            <Text style={detailLabel}>Itens:</Text>
            <Text style={detailValue}>{itemsSummary}</Text>
          </>) : null}
          {allocationLocation ? (<>
            <Text style={detailLabel}>Local de Alocação:</Text>
            <Text style={detailValue}>{allocationLocation}</Text>
          </>) : null}
        </Section>
        <Section style={buttonContainer}>
          <Button style={button} href="https://central-compras.test.invalid/estoque">
            Acessar Estoque
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} — Este é um e-mail automático, não responda.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: StockPickupReadyEmail,
  subject: 'Nova requisição liberada para retirada no estoque',
  displayName: 'Estoque: requisição liberada para retirada',
  previewData: {
    requesterName: 'Maria Silva',
    itemsSummary: '2x Notebook, 1x Mouse',
    allocationLocation: 'Showroom',
    solicitationId: '123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '10px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#1e40af', margin: '0 0 10px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '16px', margin: '0 0 20px' }
const detailLabel = { fontSize: '12px', color: '#6b7280', margin: '0 0 2px', fontWeight: 'bold' as const, textTransform: 'uppercase' as const }
const detailValue = { fontSize: '15px', color: '#111827', margin: '0 0 12px' }
const buttonContainer = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#2563eb', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '20px 0 0', textAlign: 'center' as const }
