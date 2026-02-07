import { useCallback, type RefObject } from "react";
import { logger } from "@/lib/logger";
import type { AccessibilitySettings } from "@/lib/accessibility";

export function useExport(
  svgRef: RefObject<SVGSVGElement | null> | RefObject<SVGSVGElement>,
  title: string,
  settings: AccessibilitySettings,
) {
  // Print functionality - expands labels to prevent truncation
  const handlePrint = useCallback(() => {
    if (!svgRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;

    // Fix truncated labels: expand all foreignObject elements to fit their content
    const foreignObjects = svgClone.querySelectorAll("foreignObject");
    foreignObjects.forEach((fo) => {
      // Remove width constraint to let text flow naturally
      fo.setAttribute("width", "600"); // Expanded width for printing
      // Also update any nested div with max-width
      const divs = fo.querySelectorAll("div");
      divs.forEach((div) => {
        if (div instanceof HTMLElement) {
          div.style.maxWidth = "none";
          div.style.width = "auto";
          div.style.whiteSpace = "nowrap";
          div.style.overflow = "visible";
        }
      });
    });

    // Expand the SVG viewBox to accommodate wider labels
    const bbox = svgRef.current.getBBox();
    const expandedWidth = Math.max(bbox.width * 1.5, 1600);
    const expandedHeight = Math.max(bbox.height + 200, 1000);
    svgClone.setAttribute("width", String(expandedWidth));
    svgClone.setAttribute("height", String(expandedHeight));
    svgClone.setAttribute(
      "viewBox",
      `${bbox.x - 100} ${bbox.y - 50} ${expandedWidth} ${expandedHeight}`,
    );

    const svgString = new XMLSerializer().serializeToString(svgClone);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mappa Mentale: ${title}</title>
          <style>
            @import url('https://fonts.cdnfonts.com/css/opendyslexic');

            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }

            html, body {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              font-family: ${settings.dyslexiaFont ? "OpenDyslexic, " : ""}Arial, sans-serif;
              background: white;
            }

            .print-page {
              width: 100%;
              height: 100vh;
              display: flex;
              flex-direction: column;
              padding: 10mm;
            }

            h1 {
              text-align: center;
              font-size: ${settings.largeText ? "24pt" : "18pt"};
              margin-bottom: 8mm;
              flex-shrink: 0;
            }

            .mindmap-container {
              flex: 1;
              display: flex;
              justify-content: center;
              align-items: center;
              overflow: visible;
              min-height: 0;
            }

            .mindmap-container svg {
              max-width: 100%;
              max-height: 100%;
              width: auto;
              height: auto;
              overflow: visible;
            }

            /* Ensure all text is visible */
            foreignObject { overflow: visible !important; }
            foreignObject div {
              max-width: none !important;
              white-space: nowrap !important;
              overflow: visible !important;
            }

            @media print {
              @page {
                size: A4 landscape;
                margin: 5mm;
              }

              html, body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              .print-page {
                height: 100%;
                page-break-after: avoid;
                padding: 5mm;
              }

              h1 {
                font-size: ${settings.largeText ? "20pt" : "16pt"};
                margin-bottom: 5mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-page">
            <h1>${title}</h1>
            <div class="mindmap-container">${svgString}</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [title, settings.dyslexiaFont, settings.largeText, svgRef]);

  // Download as PNG - expands labels to prevent truncation
  const handleDownload = useCallback(async () => {
    if (!svgRef.current) return;

    try {
      const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;

      // Fix truncated labels: expand all foreignObject elements to fit their content
      const foreignObjects = svgClone.querySelectorAll("foreignObject");
      foreignObjects.forEach((fo) => {
        fo.setAttribute("width", "600"); // Expanded width for download
        const divs = fo.querySelectorAll("div");
        divs.forEach((div) => {
          if (div instanceof HTMLElement) {
            div.style.maxWidth = "none";
            div.style.width = "auto";
            div.style.whiteSpace = "nowrap";
            div.style.overflow = "visible";
          }
        });
      });

      // Get dimensions with extra space for expanded labels
      const bbox = svgRef.current.getBBox();
      const width = Math.max(bbox.width * 1.5, 2000);
      const height = Math.max(bbox.height + 200, 1200);

      svgClone.setAttribute("width", String(width));
      svgClone.setAttribute("height", String(height));
      svgClone.setAttribute(
        "viewBox",
        `${bbox.x - 100} ${bbox.y - 50} ${width} ${height}`,
      );

      // Inline styles
      const allElements = svgClone.querySelectorAll("*");
      allElements.forEach((el) => {
        if (el instanceof SVGElement || el instanceof HTMLElement) {
          const computed = window.getComputedStyle(el);
          [
            "fill",
            "stroke",
            "stroke-width",
            "font-family",
            "font-size",
            "font-weight",
          ].forEach((prop) => {
            const value = computed.getPropertyValue(prop);
            if (value && value !== "none" && value !== "initial") {
              (el as HTMLElement).style.setProperty(prop, value);
            }
          });
        }
      });

      // Create canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // SVG to data URL
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgClone);
      if (!svgString.includes("xmlns=")) {
        svgString = svgString.replace(
          "<svg",
          '<svg xmlns="http://www.w3.org/2000/svg"',
        );
      }

      const base64 = btoa(unescape(encodeURIComponent(svgString)));
      const dataUrl = `data:image/svg+xml;base64,${base64}`;

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `mappa-mentale-${title.toLowerCase().replace(/\s+/g, "-")}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, "image/png");
      };

      img.onerror = () => {
        // Fallback: download SVG
        const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
        const url = URL.createObjectURL(svgBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mappa-mentale-${title.toLowerCase().replace(/\s+/g, "-")}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      img.src = dataUrl;
    } catch (err) {
      logger.error("Export error", { error: String(err) });
    }
  }, [title, svgRef]);

  return { handlePrint, handleDownload };
}
