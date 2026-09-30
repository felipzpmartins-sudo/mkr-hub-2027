import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Central de Compras'

interface ApproverQuestionProps {
  approverName?: string
  requesterName?: string
  requestType?: string
  question?: string
  solicitationId?: string
}

const requestTypeLabels: Record<string, string> = {
  product: 'Produto',
  flight: 'Passagem Aérea',
  accommodation: 'Hospedagem',
  personalized_material: 'Material Personalizado',
  apostilas: 'Apostilas',
  internal_requisition: 'Requisição Interna',
}

const ApproverQuestionEmail = ({ approverName, requesterName, requestType, question, solicitationId }: ApproverQuestionProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Nova pergunta de aprovador aguardando resposta</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={h1}>Pergunta de aprovador</Heading>
        </Section>
        <Hr style={hr} />
        <Text style={text}>
          {approverName || 'Um aprovador'} enviou uma pergunta sobre uma solicitação de compra.
        </Text>
        <Section style={detailsBox}>
          <Text style={detailLabel}>Solicitante:</Text>
          <Text style={detailValue}>{requesterName || 'Não informado'}</Text>
          <Text style={detailLabel}>Tipo:</Text>
          <Text style={detailValue}>{requestType ? (requestTypeLabels[requestType] || requestType) : 'Não informado'}</Text>
          <Text style={detailLabel}>Pergunta:</Text>
          <Text style={questionText}>{question || 'Não informado'}</Text>
        </Section>
        <Text style={text}>
          Responda dentro da plataforma para manter a conversa organizada no pedido.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href="https://central-compras.test.invalid/admin">
            Abrir Central de Compras
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          {SITE_NAME} — Pedido {solicitationId || ''}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ApproverQuestionEmail,
  subject: 'Nova pergunta de aprovador aguardando resposta',
  displayName: 'Pergunta de aprovador',
  previewData: {
    approverName: 'Juliana',
    requesterName: 'Maria Silva',
    requestType: 'product',
    question: 'A diferença dos valores é grande. Esse orçamento menor vai dar certo mesmo?',
    solicitationId: '123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '10px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#92400e', margin: '0 0 10px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#fffbeb', borderRadius: '8px', padding: '16px', margin: '0 0 20px', border: '1px solid #fde68a' }
const detailLabel = { fontSize: '12px', color: '#6b7280', margin: '0 0 2px', fontWeight: 'bold' as const, textTransform: 'uppercase' as const }
const detailValue = { fontSize: '15px', color: '#111827', margin: '0 0 12px' }
const questionText = { fontSize: '15px', color: '#111827', margin: '0 0 12px', lineHeight: '1.6', fontStyle: 'italic' }
const buttonContainer = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#ca8a04', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '20px 0 0', textAlign: 'center' as const }
