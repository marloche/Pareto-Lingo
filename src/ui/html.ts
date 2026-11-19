// Tiny HTML templating without a framework: html`` escapes every value put into it, unless the value
// is itself Html (built by html`` or marked with raw()). Views return Html; the app sets innerHTML once.

export interface Html {
  readonly __html: string;
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

/** Marks a string as safe HTML. Only for markup written in this codebase, never for data. */
export const raw = (s: string): Html => ({ __html: s });

const isHtml = (v: unknown): v is Html => typeof v === 'object' && v !== null && '__html' in v;

function render(v: unknown): string {
  if (v === null || v === undefined || v === false) return '';
  if (Array.isArray(v)) return v.map(render).join('');
  if (isHtml(v)) return v.__html;
  return esc(String(v));
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): Html {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return { __html: out };
}
