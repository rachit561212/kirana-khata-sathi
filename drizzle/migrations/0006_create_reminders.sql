CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('stock','pay','collect')),
  title text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  paid numeric NOT NULL DEFAULT 0,
  due_date date,
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','ordered','done')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own reminders" ON public.reminders FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE INDEX reminders_user_idx ON public.reminders(user_id);

CREATE TABLE public.contacts (
  user_id uuid NOT NULL,
  key text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  credit_limit numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own contacts" ON public.contacts FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE TABLE public.product_settings (
  user_id uuid NOT NULL,
  product_key text NOT NULL,
  low_stock numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, product_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_settings TO authenticated;
GRANT ALL ON public.product_settings TO service_role;
ALTER TABLE public.product_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own product settings" ON public.product_settings FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);