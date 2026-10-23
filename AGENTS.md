<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- 3D people in the hero use CC0 Quaternius GLBs in public/models (rigged, Idle/Walk/Wave clips); keep any new models CC0 so no attribution is needed.
- Authentication is Lovable Cloud Auth (email/password + Google via @/integrations/lovable); display names live in public.profiles with an auth.users trigger. Xano auth was removed.
- Receipt records for signed-in accounts persist in public.receipts with owner-only RLS; the khata store queues changed rows, exposes loading/save errors and ignores stale account responses. Browser storage is only for legacy transfer and failed-write recovery, never the source of truth.
- Statements filter confirmed, non-duplicate account records into an explicit date-range snapshot and generate PDFs with embedded Hindi fonts; never report an email as sent unless delivery was accepted by the email service.
- On phones, receipt lists use compact records and editable items use stacked fields; retain desktop tables so no page requires sideways scrolling to read or edit receipts.
- Fit the phone shop camera to the storefront width and scale fog with its distance; desktop retains the cinematic dolly, while the sticky story uses stable viewport height for scroll progress.
- Transaction extraction uses the user's Gemini credential only inside server functions, returning a validated editable draft; never automatically save model output or infer missing payment fields as confirmed facts.
- AI entries, purchased orders, review edits and repeat orders share account bill persistence and await saving before success feedback; repeat orders copy item lines so edits cannot alter their source bill.
- Spoken bill entry sends transient inline audio to Gemini's Interactions transcription surface with store disabled; keep the language hint optional and credentials server-only so recordings are not retained by the app.
