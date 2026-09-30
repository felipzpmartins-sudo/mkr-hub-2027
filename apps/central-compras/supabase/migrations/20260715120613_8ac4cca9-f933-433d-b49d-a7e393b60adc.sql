DELETE FROM public.approvals WHERE solicitation_id IN ('93d69be9-249a-41bd-abbe-d651790edc30', '14242bbd-ecfb-4294-bd46-5016b5f47d25');
DELETE FROM public.approver_questions WHERE solicitation_id IN ('93d69be9-249a-41bd-abbe-d651790edc30', '14242bbd-ecfb-4294-bd46-5016b5f47d25');
DELETE FROM public.attachments WHERE solicitation_id IN ('93d69be9-249a-41bd-abbe-d651790edc30', '14242bbd-ecfb-4294-bd46-5016b5f47d25');
DELETE FROM public.quotes WHERE solicitation_id IN ('93d69be9-249a-41bd-abbe-d651790edc30', '14242bbd-ecfb-4294-bd46-5016b5f47d25');
DELETE FROM public.receipts WHERE solicitation_id IN ('93d69be9-249a-41bd-abbe-d651790edc30', '14242bbd-ecfb-4294-bd46-5016b5f47d25');
DELETE FROM public.status_history WHERE solicitation_id IN ('93d69be9-249a-41bd-abbe-d651790edc30', '14242bbd-ecfb-4294-bd46-5016b5f47d25');
DELETE FROM public.stock_activity_log WHERE solicitation_id IN ('93d69be9-249a-41bd-abbe-d651790edc30', '14242bbd-ecfb-4294-bd46-5016b5f47d25');
DELETE FROM public.solicitations WHERE id IN ('93d69be9-249a-41bd-abbe-d651790edc30', '14242bbd-ecfb-4294-bd46-5016b5f47d25');