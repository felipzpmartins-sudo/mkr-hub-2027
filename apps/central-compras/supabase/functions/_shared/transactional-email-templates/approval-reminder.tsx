import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Central de Compras"

interface ApprovalReminderProps {
  requesterName?: string
  requestType?: string
  itemTitle?: string
  waitingDays?: number
  solicitationId?: string
}

const requestTypeLabels: Record<string, string> = {
  product: 'Produto',
  flight: 'Passagem Aérea',
  personalized_material: 'Material Personalizado',
  accommodation: 'Hospedagem',
  apostilas: 'Apostilas',
  cleaning_product: 'Produto de Limpeza',
  internal_requisition: 'Requisição Interna',
}

const ApprovalReminderEmail = ({ requesterName, requestType, itemTitle, waitingDays, solicitationId }: ApprovalReminderProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Lembrete: solicitação aguardando sua aprovação - {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={h1}>🔔 Lembrete de Aprovação</Heading>
        </Section>
        <Hr style={hr} />
        <Text style={text}>
          Olá! <strong>{requesterName || 'Um solicitante'}</strong> está pedindo um retorno sobre uma solicitação que aguarda aprovação
          {typeof waitingDays === 'number' && waitingDays > 0 ? (
            <> há <strong>{waitingDays} {waitingDays === 1 ? 'dia' : 'dias'}</strong></>
          ) : null}.
        </Text>
        <Section style={detailsBox}>
          <Text style={detailLabel}>Solicitante:</Text>
          <Text style={detailValue}>{requesterName || 'Não informado'}</Text>
          <Text style={detailLabel}>Tipo:</Text>
          <Text style={detailValue}>{requestType ? (requestTypeLabels[requestType] || requestType) : 'Não informado'}</Text>
          {itemTitle ? (
            <>
              <Text style={detailLabel}>Item:</Text>
              <Text style={detailValue}>{itemTitle}</Text>
            </>
          ) : null}
          {solicitationId ? (
            <>
              <Text style={detailLabel}>Protocolo:</Text>
              <Text style={detailValue}>#{solicitationId.slice(0, 8)}</Text>
            </>
          ) : null}
        </Section>
        <Text style={text}>
          Acesse o sistema para revisar a solicitação e registrar sua aprovação ou rejeição.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href="https://central-compras.test.invalid/approval-analysis">
            Acessar Aprovações
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
  component: ApprovalReminderEmail,
  subject: 'Lembrete: solicitação aguardando sua aprovação',
  displayName: 'Lembrete de aprovação pendente',
  previewData: {
    requesterName: 'Maria Silva',
    requestType: 'product',
    itemTitle: 'Notebook Dell Inspiron',
    waitingDays: 5,
    solicitationId: '12345678-abcd',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '10px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#b45309', margin: '0 0 10px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#fffbeb', borderRadius: '8px', padding: '16px', margin: '0 0 20px', border: '1px solid #fde68a' }
const detailLabel = { fontSize: '12px', color: '#6b7280', margin: '0 0 2px', fontWeight: 'bold' as const, textTransform: 'uppercase' as const }
const detailValue = { fontSize: '15px', color: '#111827', margin: '0 0 12px' }
const buttonContainer = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#d97706', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '20px 0 0', textAlign: 'center' as const }
