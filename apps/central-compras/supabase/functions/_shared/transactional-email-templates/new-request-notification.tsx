import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Central de Compras"

interface NewRequestNotificationProps {
  requesterName?: string
  requestType?: string
  isUrgent?: boolean
  solicitationId?: string
}

const requestTypeLabels: Record<string, string> = {
  product: 'Produto',
  flight: 'Passagem Aérea',
  personalized_material: 'Material Personalizado',
  accommodation: 'Hospedagem',
  apostilas: 'Apostilas',
  internal_requisition: 'Requisição Interna',
  cleaning_product: 'Produto de Limpeza',
}

const NewRequestNotificationEmail = ({ requesterName, requestType, isUrgent, solicitationId }: NewRequestNotificationProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Nova solicitação registrada - {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={h1}>{isUrgent ? '🚨 Nova Solicitação Urgente' : '🔔 Nova Solicitação'}</Heading>
        </Section>
        <Hr style={hr} />
        <Text style={text}>Uma nova solicitação foi registrada no sistema.</Text>
        <Section style={detailsBox}>
          <Text style={detailLabel}>Solicitante:</Text>
          <Text style={detailValue}>{requesterName || 'Não informado'}</Text>
          <Text style={detailLabel}>Tipo:</Text>
          <Text style={detailValue}>{requestType ? (requestTypeLabels[requestType] || requestType) : 'Não informado'}</Text>
          {solicitationId ? (
            <>
              <Text style={detailLabel}>Pedido:</Text>
              <Text style={detailValue}>#{String(solicitationId).slice(0, 8)}</Text>
            </>
          ) : null}
        </Section>
        <Section style={buttonContainer}>
          <Button style={button} href="https://central-compras.test.invalid/">
            Abrir o sistema
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} — Este é um e-mail automático, não responda.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewRequestNotificationEmail,
  subject: 'Nova solicitação registrada',
  displayName: 'Notificação de nova solicitação',
  previewData: {
    requesterName: 'Maria Silva',
    requestType: 'product',
    isUrgent: false,
    solicitationId: '123abc45',
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
