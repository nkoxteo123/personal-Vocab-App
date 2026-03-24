import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Use Y-position from transform to detect line/paragraph breaks
    let lastY: number | null = null;
    const lines: string[] = [];
    let currentLine = '';

    for (const item of content.items) {
      if (!('str' in item) || !item.str) continue;

      const text = item.str;
      // transform[5] = Y position (PDF coordinate: bottom-up)
      // transform[3] = font height (approximate)
      const y = (item as any).transform?.[5] ?? 0;
      const height = Math.abs((item as any).transform?.[3] ?? 12);

      if (lastY !== null) {
        const dy = Math.abs(lastY - y);

        if (dy > height * 2.0) {
          // Large gap → paragraph break (blank line)
          lines.push(currentLine.trimEnd());
          lines.push('');
          currentLine = text;
        } else if (dy > height * 0.5) {
          // Small gap → next line in same paragraph (merge them)
          const connectWithSpace = currentLine.length > 0 && !currentLine.endsWith('-') && !currentLine.endsWith(' ');
          currentLine += (connectWithSpace ? ' ' : '') + text;
        } else {
          // Same line — append with space if needed
          if (currentLine && !currentLine.endsWith(' ') && !text.startsWith(' ')) {
            currentLine += ' ';
          }
          currentLine += text;
        }
      } else {
        currentLine = text;
      }

      lastY = y;
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trimEnd());
    }

    textParts.push(lines.join('\n'));
  }

  const fullText = textParts.join('\n\n--- Page Break ---\n\n');

  if (fullText.length < 100 * pdf.numPages) {
    console.warn('PDF text extraction yielded very little text. The PDF may contain scanned images.');
  }

  return fullText;
}
