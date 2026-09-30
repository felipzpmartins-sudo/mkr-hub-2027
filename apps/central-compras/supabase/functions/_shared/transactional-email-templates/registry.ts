/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as approvalNotification } from './approval-notification.tsx'
import { template as approvalReminder } from './approval-reminder.tsx'
import { template as approverQuestion } from './approver-question.tsx'
import { template as newRequestNotification } from './new-request-notification.tsx'
import { template as redoQuotes } from './redo-quotes.tsx'
import { template as requestRejected } from './request-rejected.tsx'
import { template as stockPickupReady } from './stock-pickup-ready.tsx'
import { template as stockPiecesStatus } from './stock-pieces-status.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'approval-notification': approvalNotification,
  'approval-reminder': approvalReminder,
  'approver-question': approverQuestion,
  'new-request-notification': newRequestNotification,
  'redo-quotes': redoQuotes,
  'request-rejected': requestRejected,
  'stock-pickup-ready': stockPickupReady,
  'stock-pieces-status': stockPiecesStatus,
}
