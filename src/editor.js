// Finding a ```stepper block in the editor, for the "open in full screen" command.
// `editor` only needs getCursor(), getLine() and lineCount(), so tests can pass a fake one.

// The YAML inside the ```stepper block the cursor is in, or null.
export function blockAtCursor(editor) {
  const cursor = editor.getCursor().line;
  let start = -1;
  for (let line = cursor; line >= 0; line--) {
    const text = editor.getLine(line).trim();
    if (text.startsWith('```stepper')) { start = line; break; }
    if (text.startsWith('```') && line !== cursor) return null;
  }
  if (start < 0) return null;
  const lines = [];
  for (let line = start + 1; line < editor.lineCount(); line++) {
    const text = editor.getLine(line);
    if (text.trim().startsWith('```')) return line >= cursor ? lines.join('\n') : null;
    lines.push(text);
  }
  return null;
}
