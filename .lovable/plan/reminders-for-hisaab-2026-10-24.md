# Reminders for Hisaab

A new **Reminders** page (main tab, with a count badge) with three sections. Everything is saved to the shopkeeper's account and works across devices.

## 1. Stock running low
- Each product gets an optional "remind me below" quantity. When automatic stock drops to or below it, the product shows up here on its own.
- Shopkeepers can also add a reminder by hand, or by voice/typing ("Khata, yeh stock khatam hai, add kar do") — the AI fills in the product name, you check it and save. Nothing is saved without review.
- Each reminder shows the last supplier you bought it from, the last rate, and a **Call** button (opens the phone dialler) when that supplier has a phone number saved.
- Supplier pages get an "Add phone number" field.
- Mark as "Ordered" or "Done" to clear it.

## 2. Money to pay
- Entries for money owed to a supplier or anyone else: name, amount, due date, note.
- Unpaid purchased orders appear here automatically.
- Sorted by due date. "Due in 1–2 days" is highlighted amber, overdue is highlighted red.
- Mark paid (fully or part), which updates the remaining amount.

## 3. Money to collect
- Customers who owe money, sorted highest to lowest.
- Credit (udhaar) sales on the Sales page add to the customer's balance; recording a payment reduces it.
- Each customer can have a credit limit. When a new credit sale would cross it, a red warning shows how much over it goes, with **Cancel** or **Save anyway**.

## How reminders reach the shopkeeper
- In the app: a badge on the Reminders tab and a short "Due soon / Overdue" banner on the Add bill page when opening the app.
- Email reminders are not included now, because the sender domain is still not verified. They can be added once it is.

## Not included
- Phone, SMS or WhatsApp reminders (consistent with earlier choice of email only).
- Automatic ordering from suppliers.

## Technical details
- New owner-only tables (RLS + grants): `reminders` (kind: stock/pay/collect, title, amount, due_date, status, contact name, product key), `contacts` (name normalized like suppliers, phone, role, credit_limit), `product_settings` (product key, low-stock threshold).
- Low-stock list derived from existing `receiptProducts()` plus thresholds; not stored as rows to avoid drift.
- Money to collect derived from credit sales and payments in the account receipts plus manual entries; unpaid purchased orders derived for Money to pay.
- AI entry reuses the existing server-side transaction extraction with a "reminder" mode returning a validated draft.
- Credit-limit check is a pure function used by the Sales save flow; tests for: limit exceeded, exactly at limit, no limit set, due-in-2-days and overdue classification, sorting by outstanding amount.
- Route `src/routes/app/reminders.tsx`, added to main tabs; head metadata included.
- Verify end-to-end signed in: add threshold → sale lowers stock → reminder appears; credit sale over limit shows warning; reload persists.
