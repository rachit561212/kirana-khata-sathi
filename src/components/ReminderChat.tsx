import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { BellRing, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmt, dateLabel } from "@/lib/khata";
import { readReminder } from "@/lib/reminder-entry.functions";
import { createReminder, loadReminderData, saveContact } from "@/lib/reminder-data";
import { nextQuestion, type ChatDraft } from "@/lib/reminder-chat";
import { cleanPhone, findOpenDuplicate, validDate, validPhone } from "@/lib/reminders";

type Msg = { from: "you" | "hisaab"; text: string };
const LABEL = { stock: "Stock", pay: "Pay", collect: "Collect" } as const;

/** Conversational reminder entry: asks for missing details, confirms before saving, and refuses duplicates. */
export function ReminderChat({ command, onDone }: { command: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "you", text: command }]);
  const [draft, setDraft] = useState<ChatDraft | null>(null);
  const [field, setField] = useState<keyof ChatDraft | null>(null);
  const [reply, setReply] = useState(""); const [busy, setBusy] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);
  const savingRef = useRef(false);
  const say = (text: string) => setMsgs((m) => [...m, { from: "hisaab", text }]);
  const advance = (d: ChatDraft) => { setDraft(d); const q = nextQuestion(d); setField(q?.field ?? null); if (q) say(q.question); };

  useEffect(() => { void (async () => {
    try {
      const r = await readReminder({ data: { text: command } });
      const d = r.draft;
      if (!d) say((r.error ?? "I couldn't read that.") + " Let's fill it in together.");
      advance({ kind: d?.kind ?? null, title: d?.title?.trim() || null, amount: d?.amount ?? null, due_date: d?.due_date ?? null, supplier_name: d?.supplier_name?.trim() || null, supplier_phone: d?.supplier_phone ? cleanPhone(d.supplier_phone) : null, quantity: d?.quantity ?? null });
    } catch { say("AI reading is unavailable right now. Let's fill it in together."); advance({ kind: null, title: null, amount: null, due_date: null, supplier_name: null, supplier_phone: null, quantity: null }); }
    finally { setBusy(false); }
  })(); }, [command]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = (text: string) => {
    if (!draft || !field) return;
    setMsgs((m) => [...m, { from: "you", text }]);
    const t = text.trim(); const d = { ...draft };
    if (field === "kind") { const k = /stock|khatam|माल/i.test(t) ? "stock" : /pay|dena|देना/i.test(t) ? "pay" : /collect|lena|लेना|owe/i.test(t) ? "collect" : null; if (!k) return say("Please type stock, pay or collect."); d.kind = k; }
    if (field === "title") { if (t.length < 1) return say("Please type a name."); d.title = t; }
    if (field === "amount") { const n = Number(t.replace(/[₹,\s]|rs\.?|rupaye|rupees/gi, "")); if (!(n > 0 && n < 1e9)) return say("Please type the amount as a number, like 500."); d.amount = n; }
    if (field === "due_date") { if (!validDate(t)) return say("Please type the date like 2026-10-30."); d.due_date = t; }
    if (field === "supplier_name") {
      d.askedSupplier = true;
      if (!/^(skip|no|nahi|nahin)$/i.test(t)) {
        const phone = (t.match(/\+?\d[\d\s-]{5,}\d/) ?? [""])[0];
        if (phone && !validPhone(phone)) return say("That phone number doesn't look right. Type the supplier and number again, or 'skip'.");
        d.supplier_name = t.replace(phone, "").replace(/[,\-–]+\s*$/, "").trim() || null; d.supplier_phone = phone ? cleanPhone(phone) : null;
      }
    }
    advance(d);
  };

  const save = async () => {
    if (!draft?.kind || !draft.title || savingRef.current) return;
    savingRef.current = true; setBusy(true);
    try {
      const data = await loadReminderData();
      if (!data) { say("Please sign in first, then try again."); return; }
      const dup = findOpenDuplicate(data.reminders, draft.kind, draft.title, draft.amount);
      if (dup) { say(`This is already in your reminders (${dup.title}${dup.amount ? `, ${fmt(dup.amount)}` : ""}), so I didn't add it again.`); setSaved(draft.kind); return; }
      if (draft.kind === "collect") {
        const owed = data.reminders.filter((r) => r.kind === "collect" && r.status !== "done" && r.title.trim().toLocaleLowerCase() === draft.title.trim().toLocaleLowerCase()).reduce((s, r) => s + r.amount - r.paid, 0);
        const lim = data.contacts.find((c) => c.name.trim().toLocaleLowerCase() === draft.title!.trim().toLocaleLowerCase())?.credit_limit;
        if (lim != null && owed + (draft.amount ?? 0) > lim && !window.confirm(`Credit limit exceeded! This customer would owe ${fmt(owed + draft.amount!)}, exceeding their ${fmt(lim)} limit by ${fmt(owed + draft.amount! - lim)}. Proceed anyway?`)) { say("Cancelled. Nothing was added."); return; }
      }
      await createReminder(data.userId, { kind: draft.kind, title: draft.title, amount: draft.amount ?? 0, due_date: draft.due_date, supplier_name: draft.supplier_name ?? "", supplier_phone: draft.supplier_phone ?? "", quantity: draft.quantity });
      if (draft.supplier_name && draft.supplier_phone) await saveContact(data.userId, draft.supplier_name, { phone: draft.supplier_phone }, data.contacts.find((c) => c.name.toLocaleLowerCase() === draft.supplier_name!.toLocaleLowerCase()));
      await qc.invalidateQueries({ queryKey: ["reminders"] });
      say(`Added to ${LABEL[draft.kind]} reminders: ${draft.title}${draft.amount ? `, ${fmt(draft.amount)}` : ""}.`); setSaved(draft.kind);
    } catch (e) { say(e instanceof Error ? e.message : "Could not save. Try again."); }
    finally { savingRef.current = false; setBusy(false); }
  };

  const ready = draft && !field && draft.kind && draft.title;
  return <div className="rounded-xl border bg-card p-4">
    <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><BellRing className="h-4 w-4 text-primary" />Add a reminder</p>
    <ul className="space-y-2" aria-live="polite">{msgs.map((m, i) => <li key={i} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.from === "you" ? "ml-auto bg-foreground text-background" : "bg-muted"}`}>{m.text}</li>)}</ul>
    {busy && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Working…</p>}
    {!busy && field && <form className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2" onSubmit={(e) => { e.preventDefault(); if (reply.trim()) { answer(reply); setReply(""); } }}>
      <input value={reply} onChange={(e) => setReply(e.target.value)} aria-label="Your answer" autoFocus className="h-11 min-w-0 rounded-md border bg-background px-3 text-base sm:text-sm" />
      <Button type="submit" className="min-h-11">Reply</Button></form>}
    {!busy && ready && !saved && <div className="mt-3 rounded-lg border p-3 text-sm">
      <p className="font-medium">Save this?</p>
      <p>{LABEL[draft.kind!]} · {draft.title}{draft.amount ? ` · ${fmt(draft.amount)}` : ""}{draft.due_date ? ` · by ${dateLabel(draft.due_date)}` : ""}{draft.quantity != null ? ` · ${draft.quantity} left` : ""}{draft.supplier_name ? ` · ${draft.supplier_name}` : ""}{draft.supplier_phone ? ` (${draft.supplier_phone})` : ""}</p>
      <div className="mt-2 flex gap-2"><Button className="min-h-11" onClick={() => void save()}>Save reminder</Button><Button variant="outline" className="min-h-11" onClick={onDone}>Cancel</Button></div></div>}
    {saved && <div className="mt-3 flex gap-2"><Button asChild className="min-h-11"><Link to="/app/reminders" search={{ tab: saved as "stock" | "pay" | "collect" }}>View reminder</Link></Button><Button variant="outline" className="min-h-11" onClick={onDone}>Done</Button></div>}
  </div>;
}
