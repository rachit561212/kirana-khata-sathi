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
- Xano authentication uses same-origin server functions and an HTTP-only session cookie; never expose Xano tokens to browser storage or return them to components.
- Keep synthetic receipt records separate from Xano authentication until documented, implemented receipt endpoints exist; placeholder null responses are not saved records.
- On phones, receipt lists use compact records and editable items use stacked fields; retain desktop tables so no page requires sideways scrolling to read or edit receipts.
- Fit the phone shop camera to the storefront width and scale fog with its distance; desktop retains the cinematic dolly, while the sticky story uses stable viewport height for scroll progress.
