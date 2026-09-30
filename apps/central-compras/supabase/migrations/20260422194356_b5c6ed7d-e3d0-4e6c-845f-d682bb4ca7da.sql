ALTER TABLE public.status_history DROP CONSTRAINT IF EXISTS status_history_new_status_check;
ALTER TABLE public.status_history DROP CONSTRAINT IF EXISTS status_history_old_status_check;