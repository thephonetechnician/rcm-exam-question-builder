# RCM Academic Portal — Aurora Academic

User direction: expressive and polished, explicitly moving away from Minimalism,
with night mode throughout the portal. The existing JavaScript app remains; the
visual upgrade requires no React migration or new packages.

Verified ui-ux-pro-max references: `aurora gradients dashboard` (Aurora UI, suitable
for expressive hero sections) and `dark mode contrast` (Dark Mode OLED). The broad
design-system query returned Apple-specific Liquid Glass and a storytelling layout;
those patterns were rejected for this workflow. Retain opaque, readable form
surfaces and predictable navigation, with gradients confined to decorative chrome.

## Visual direction

Indigo/plum hero and builder header, teal actions, warm gold details, rounded cards,
soft depth and a dark navigation rail. Inline SVG icons replace decorative Unicode
navigation/tool icons. Use system sans-serif text and an editorial serif hero title.
Do not add invented statistics or features, paid assets or external font requests.

`css/academic-theme.css` is the final visual layer on all four app pages. The earlier
`minimal-theme.css` remains a compatibility baseline; its visible styling is
superseded. Shared day/night tokens control surfaces, ink, borders, focus and semantic
states. Builder overrides account for its local custom properties and fixed styles.

## Appearance behaviour

`js/theme.js` runs in the head before paint. With no saved preference, follow
prefers-color-scheme; the header toggle sets a local preference under rcm-appearance.
Day mode / Night mode controls have accessible action labels and pressed states.
Follow live system changes only without an explicit choice; sync between tabs.
Storage failures must not break the app or toggle.

The live examination paper stays white/black in both themes, including logos,
signature lines and marks. Export code, PIN/security controls and backend services
are unchanged. Theme switching does not rerender forms or save data.

## Quality gates

Text contrast at least 4.5:1 for tested main/muted/action/status combinations;
form boundaries at least 3:1. Controls at least 44px, visible keyboard focus and
reduced-motion support. Keep the mobile view switch and internally scrollable
score tables. Check pages at 375, 768, 1024 and 1440px. Use synthetic screenshot
data. Deploy with the existing frontend Git workflow only.
