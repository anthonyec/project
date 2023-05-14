export function textBlock(strings: TemplateStringsArray) {
  const lines = strings[0].split('\n');

  let shortestIndent: string | null = null;

  for (const line of lines) {
    const indent = line.match(/^\s*/)?.[0] ?? '';

    if (line.trim() === '') {
      continue;
    }

    if (shortestIndent === null) {
      shortestIndent = indent;
      continue;
    }

    if (indent.length < shortestIndent.length) {
      shortestIndent = indent;
      continue;
    }
  }

  const trimmedLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.slice(shortestIndent?.length, line.length);

    trimmedLines.push(trimmedLine);
  }

  return trimmedLines.join('\n').trim() + '\n';
}
