# Question Builder workspace

Follow MASTER.md. Use a balanced two-column editor/preview workspace above 1100px;
on smaller screens use explicit Edit paper / Paper preview buttons. Keep original
form state while switching views. Use clear section dividers, generous question
text areas, consistent field labels and restrained maroon selected states.

The preview renders the existing Word XML locally with text nodes, not raw user
HTML. It shares content and structure with the download generator, including both
logos, course metadata, theory subparts/marks, objective options, gap questions and
mixed sections. Fit width is the default; Actual size enables readable text within
the scrollable paper container. It is a continuous A4-width layout guide, not an
exact Word pagination engine. State this clearly. Do not include PINs or lecturer
credentials in the paper or add background saves/network calls.

Refresh only the preview during input, without replacing the editor or moving
focus. Do not announce the full paper on each keystroke. Associate editor labels
with fields and retain keyboard access to the preview scroll area and view controls.

Local synthetic browser checks: theory text and split marks, objective options,
literal HTML-like text, gap insertion, mixed section order, mobile view switching,
and responsive widths. Backend and document generation code are unchanged.
