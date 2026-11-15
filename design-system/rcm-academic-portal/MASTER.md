# RCM Academic Portal — Minimalism

Source: repository `ui-ux-pro-max` skill, verified style search
`Minimalism Swiss enterprise dashboard` (Minimalism & Swiss Style).
The broad academic search returned a newsletter layout; that layout was rejected.

Keep the current application structure and workflows. Use white surfaces on a
near-white canvas, dark neutral text, thin neutral borders and restrained maroon
actions. Use system sans-serif fonts, clear heading hierarchy, 4px corners, no
decorative gradients or card shadows. Dialogs may use a subtle shadow for layering.
No external fonts, icon libraries or animation packages are required.

Tokens and all overrides live in `css/minimal-theme.css`, loaded last. Portal
pages use `portal-theme`; the Question Builder uses `builder-theme` so its styles
remain isolated. The legacy standalone HTML and exported document styles are untouched.

Body 16px; supporting text 13–14px. Controls at least 44px tall, score checkboxes
24px, visible maroon keyboard focus. Preserve semantic error/success colours and
explicit state labels. Respect reduced motion. Mobile navigation wraps; wide score
tables scroll inside their own container, not the page.

This is a frontend update. Deploy by syncing the static files through the existing
Git workflow; no Apps Script update is required for this theme alone.
