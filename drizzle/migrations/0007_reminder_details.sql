ALTER TABLE public.reminders ADD COLUMN supplier_name text NOT NULL DEFAULT '';
ALTER TABLE public.reminders ADD COLUMN supplier_phone text NOT NULL DEFAULT '';
ALTER TABLE public.reminders ADD COLUMN quantity numeric;
ALTER TABLE public.reminders ADD COLUMN entry_date date NOT NULL DEFAULT current_date;
ALTER TABLE public.reminders ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();