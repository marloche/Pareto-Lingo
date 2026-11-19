// Saving and opening the backup file. Same approach as Habit-Quest: the share sheet where the browser
// offers it for files (iPhone: Save to Files), a plain download everywhere else.

/** Saves `text` as a file; false if the share sheet was closed without saving. */
export async function saveFile(name: string, text: string): Promise<boolean> {
  const file = new File([text], name, { type: 'application/json' });
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return false; // closed the share sheet
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return true;
}

/** Lets the user pick a file and returns its text, or undefined if they cancel. */
export function openFile(accept = 'application/json,.json'): Promise<string | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      if (!f) return resolve(undefined);
      f.text().then(resolve, () => resolve(undefined));
    });
    input.addEventListener('cancel', () => resolve(undefined));
    input.click();
  });
}
