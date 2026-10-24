CREATE TABLE public.receipts (
  user_id uuid NOT NULL,
  id text NOT NULL,
  record jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  CONSTRAINT receipt_record_object CHECK (jsonb_typeof(record) = 'object' AND record->>'id' = id AND record ?& ARRAY['id','vendor','date','source','payment','kind','conf','items','status']),
  CONSTRAINT receipt_record_items CHECK (jsonb_typeof(record->'items') = 'array'),
  CONSTRAINT receipt_record_kind CHECK (record->>'kind' IN ('spent', 'received')),
  CONSTRAINT receipt_record_status CHECK (record->>'status' IN ('new', 'accepted', 'corrected', 'dismissed'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT ALL ON public.receipts TO service_role;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own bills" ON public.receipts FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Add own bills" ON public.receipts FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Edit own bills" ON public.receipts FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Delete own bills" ON public.receipts FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE FUNCTION public.touch_receipt_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER receipt_updated_at BEFORE UPDATE ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.touch_receipt_updated_at();