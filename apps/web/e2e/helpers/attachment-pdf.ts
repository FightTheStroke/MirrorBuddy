export function twoPagePdf(): Buffer {
  return textPdf([
    'The fictional observatory opened in 1847.',
    'The fictional telescope has a violet lens.',
  ]);
}

/** Valid text PDFs, optionally carrying a large unused stream to exercise file-size handling. */
export function textPdf(texts: string[], payloadBytes = 0): Buffer {
  const fontId = 3 + texts.length * 2;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${texts.map((_, i) => `${3 + i * 2} 0 R`).join(' ')}] /Count ${texts.length} >>`,
  ];
  for (const [index, text] of texts.entries()) {
    const escaped = text.replace(/[\\()]/g, '\\$&');
    const stream = `BT /F1 18 Tf 50 700 Td (${escaped}) Tj ET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${4 + index * 2} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  if (payloadBytes > 0) {
    objects.push(`<< /Length ${payloadBytes} >>\nstream\n${'x'.repeat(payloadBytes)}\nendstream`);
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
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(document);
}
