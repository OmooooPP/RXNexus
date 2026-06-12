/**
 * Utility to print a target DOM element by opening a beautiful high-fidelity print window,
 * copying content, importing premium styling (Tailwind, Sarabun, Inter fonts), and triggering print.
 */
export function printElementByNewWindow(elementId: string, pageTitle: string = 'Print_Document'): boolean {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`[Print Utility] Target element with ID "${elementId}" not found in current DOM.`);
    return false;
  }

  // Set page title temporarily
  const originalTitle = document.title;
  if (pageTitle) {
    document.title = pageTitle;
  }

  // Try opening a new clean print-optimized popup window
  const printWindow = window.open('', '_blank', 'width=1000,height=1200,scrollbars=yes,resizable=yes');
  
  if (printWindow) {
    // Elegant standalone document frame containing Google Fonts (Prompt, Sarabun, Inter) and Tailwind CDN
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${pageTitle}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;450;600;800;900&family=Prompt:wght@300;500;700;900&family=Sarabun:ital,wght@0,300;0,500;0,700;0,800;1,300&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
          <!-- Include Tailwind CSS CDN -->
          <script src="https://cdn.tailwindcss.com"></script>
          <script>
            tailwind.config = {
              theme: {
                extend: {
                  fontFamily: {
                    sans: ['"Prompt"', '"Sarabun"', '"Inter"', 'sans-serif'],
                    mono: ['"JetBrains Mono"', 'monospace'],
                  }
                }
              }
            }
          </script>
          <style>
            body {
              font-family: "Prompt", "Sarabun", "Inter", sans-serif;
              background-color: #ffffff;
              color: #1e293b;
              margin: 0;
              padding: 15mm 15mm 15mm 15mm !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              size: A4;
              margin: 0 !important;
            }
            .page-break {
              page-break-before: always;
            }
            .no-break {
              page-break-inside: avoid;
            }
            /* Table aesthetic updates and ensuring no text wraps/overflows awkwardly */
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: auto;
            }
            th, td {
              border-bottom: 1px solid #e2e8f0;
              word-break: break-word;
            }
            /* Neutralize fixed pixel/mm dimensions on outer wrappers when printing */
            div[id="printable-area"], .w-\\[210mm\\] {
              width: 100% !important;
              max-width: 100% !important;
              min-width: 0 !important;
              padding: 2mm 0 !important;
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }
          </style>
        </head>
        <body class="p-2">
          <div class="w-full">
            ${element.innerHTML}
          </div>
          <script>
            // Ensure images and fonts are fully loaded before calling the browser print preview
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.focus();
                window.print();
                // Close after a brief delay to let print preview open
                setTimeout(() => {
                  window.close();
                }, 1000);
              }, 500);
            });
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    return true;
  }

  // Fallback to in-page print if popup window is blocked by browser security
  console.warn('[Print Utility] Popup window was blocked. Falling back to same-window print rendering.');
  
  try {
    window.print();
  } catch (err) {
    console.error('In-page print trigger failed:', err);
    return false;
  } finally {
    if (pageTitle) {
      document.title = originalTitle;
    }
  }

  return true;
}

