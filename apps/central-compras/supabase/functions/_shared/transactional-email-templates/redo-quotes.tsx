import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Central de Compras"

interface RedoQuotesProps {
  vetoApproverName?: string
  requesterName?: string
  requestType?: string
  reason?: string
  solicitationId?: string
}

const requestTypeLabels: Record<string, string> = {
  product: 'Produto',
  flight: 'Passagem Aérea',
  accommodation: 'Hospedagem',
  personalized_material: 'Material Personalizado',
  apostilas: 'Apostilas',
}

const RedoQuotesEmail = ({ vetoApproverName, requesterName, requestType, reason, solicitationId }: RedoQuotesProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Solicitação reprovada — refazer orçamentos</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={h1}>⚠️ Refazer Orçamentos</Heading>
        </Section>
        <Hr style={hr} />
        <Text style={text}>
          Uma solicitação foi <strong>reprovada</strong> por {vetoApproverName || 'um aprovador'} e
          precisa ter os orçamentos refeitos.
        </Text>
        <Section style={detailsBox}>
          <Text style={detailLabel}>Solicitante:</Text>
          <Text style={detailValue}>{requesterName || 'Não informado'}</Text>
          <Text style={detailLabel}>Tipo:</Text>
          <Text style={detailValue}>{requestType ? (requestTypeLabels[requestType] || requestType) : 'Não informado'}</Text>
          <Text style={detailLabel}>Motivo da reprovação:</Text>
          <Text style={detailValue}>{reason || 'Não informado'}</Text>
        </Section>
        <Text style={text}>
          Acesse o sistema para anexar novos orçamentos. As aprovações anteriores foram resetadas.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href="https://central-compras.test.invalid/admin">
            Acessar Sistema
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          {SITE_NAME} — Este é um e-mail automático, não responda.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RedoQuotesEmail,
  subject: 'Solicitação reprovada — refazer orçamentos',
  displayName: 'Refazer orçamentos (reprovação)',
  previewData: {
    vetoApproverName: 'Rafael',
    requesterName: 'Maria Silva',
    requestType: 'product',
    reason: 'Valores acima do esperado, buscar novos fornecedores.',
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
const buttonContainer = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#dc2626', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '20px 0 0', textAlign: 'center' as const }
