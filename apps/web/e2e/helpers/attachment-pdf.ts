export function twoPagePdf(): Buffer {
  return textPdf([
    'The fictional observatory opened in 1847.',
    'The fictional telescope has a violet lens.',
  ]);
}

interface PdfOptions {
  /** Size of an unused stream, to exercise file-size handling with a still-valid PDF. */
  payloadBytes?: number;
  /** Adds a standard security handler whose password is unknown: readers must ask for it. */
  passwordProtected?: boolean;
}

const textStream = (text: string) =>
  `BT /F1 18 Tf 50 700 Td (${text.replace(/[\\()]/g, '\\$&')}) Tj ET`;

/** Valid PDFs whose pages carry real text objects. */
export function textPdf(texts: string[], payloadBytes = 0): Buffer {
  return buildPdf(texts.map(textStream), { payloadBytes });
}

/** Pages with only vector drawing and no text, as a scanned page looks to a text extractor. */
export function drawingOnlyPdf(pages: number): Buffer {
  return buildPdf(Array.from({ length: pages }, () => '0 0 0 rg 50 50 400 300 re f'));
}

/** A mixed handout: readable text first, then a page that needs OCR. */
export function mixedPdf(text: string): Buffer {
  return buildPdf([textStream(text), '0 0 0 rg 50 50 400 300 re f']);
}

export function passwordProtectedPdf(): Buffer {
  return buildPdf([textStream('Locked notes')], { passwordProtected: true });
}

function buildPdf(streams: string[], options: PdfOptions = {}): Buffer {
  const fontId = 3 + streams.length * 2;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${streams.map((_, i) => `${3 + i * 2} 0 R`).join(' ')}] /Count ${streams.length} >>`,
  ];
  for (const [index, stream] of streams.entries()) {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${4 + index * 2} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const payloadBytes = options.payloadBytes ?? 0;
  if (payloadBytes > 0) {
    objects.push(`<< /Length ${payloadBytes} >>\nstream\n${'x'.repeat(payloadBytes)}\nendstream`);
  }
  let encryption = '';
  if (options.passwordProtected) {
    const hash = 'ab'.repeat(32);
    objects.push(`<< /Filter /Standard /V 1 /R 2 /O <${hash}> /U <${hash}> /P -4 >>`);
    const id = '0123456789abcdef'.repeat(2);
    encryption = ` /Encrypt ${objects.length} 0 R /ID [<${id}> <${id}>]`;
  }
  let document = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(document));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(document);
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  document += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('');
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${encryption} >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(document);
}
