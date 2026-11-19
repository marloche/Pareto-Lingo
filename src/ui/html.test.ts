import { describe, expect, it } from 'vitest';
import { html, raw } from './html.ts';

describe('html``', () => {
  it('escapes values but not nested templates', () => {
    const name = '<b>"Том" & Мэри</b>';
    const out = html`<p title="${name}">${name} ${html`<i>${'ok'}</i>`} ${raw('<hr>')}</p>`;
    expect(out.__html).toBe('<p title="&lt;b&gt;&quot;Том&quot; &amp; Мэри&lt;/b&gt;">&lt;b&gt;&quot;Том&quot; &amp; Мэри&lt;/b&gt; <i>ok</i> <hr></p>');
  });

  it('joins lists and drops empty values', () => {
    expect(html`${[1, 2].map((n) => html`<li>${n}</li>`)}${false}${null}${undefined}`.__html).toBe('<li>1</li><li>2</li>');
  });
});
