import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Central de Compras"

interface RequestRejectedProps {
  requesterName?: string
  requestType?: string
  itemTitle?: string
  reason?: string
  rejectedByName?: string
  solicitationId?: string
}

const requestTypeLabels: Record<string, string> = {
  product: 'Produto',
  flight: 'Passagem Aérea',
  accommodation: 'Hospedagem',
  personalized_material: 'Material Personalizado',
  apostilas: 'Apostilas',
}

const RequestRejectedEmail = ({
  requesterName,
  requestType,
  itemTitle,
  reason,
  rejectedByName,
}: RequestRejectedProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Sua solicitação foi rejeitada</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={h1}>❌ Solicitação Rejeitada</Heading>
        </Section>
        <Hr style={hr} />
        <Text style={text}>
          Olá <strong>{requesterName || 'usuário'}</strong>,
        </Text>
        <Text style={text}>
          Informamos que a sua solicitação foi <strong>rejeitada</strong>
          {rejectedByName ? <> por <strong>{rejectedByName}</strong></> : null}.
        </Text>
        <Section style={detailsBox}>
          <Text style={detailLabel}>Tipo:</Text>
          <Text style={detailValue}>
            {requestType ? (requestTypeLabels[requestType] || requestType) : 'Não informado'}
          </Text>
          {itemTitle ? (
            <>
              <Text style={detailLabel}>Item:</Text>
              <Text style={detailValue}>{itemTitle}</Text>
            </>
          ) : null}
          <Text style={detailLabel}>Motivo da rejeição:</Text>
          <Text style={detailValue}>{reason || 'Não informado'}</Text>
        </Section>
        <Text style={text}>
          Caso tenha dúvidas sobre essa decisão, entre em contato com a área de compras.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          {SITE_NAME} — Este é um e-mail automático, não responda.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RequestRejectedEmail,
  subject: 'Sua solicitação foi rejeitada',
  displayName: 'Solicitação rejeitada (admin)',
  previewData: {
    requesterName: 'Maria Silva',
    requestType: 'product',
    itemTitle: 'Cadeira ergonômica',
    reason: 'Item já disponível em estoque, não há necessidade de aquisição no momento.',
    rejectedByName: 'Richard',
    solicitationId: '123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '10px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#b91c1c', margin: '0 0 10px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#fef2f2', borderRadius: '8px', padding: '16px', margin: '0 0 20px', border: '1px solid #fecaca' }
const detailLabel = { fontSize: '12px', color: '#6b7280', margin: '0 0 2px', fontWeight: 'bold' as const, textTransform: 'uppercase' as const }
const detailValue = { fontSize: '15px', color: '#111827', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '20px 0 0', textAlign: 'center' as const }
