export function clearSvgChildren(svg: SVGSVGElement): void {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
}

export function countNodes(markdown: string): number {
  const lines = markdown.split('\n');
  return lines.filter((line) => line.trim().startsWith('#')).length;
}

