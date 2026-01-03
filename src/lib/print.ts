type PrintHtmlOptions = {
  width?: number;
  height?: number;
  /** Extra delay after load before calling print (helps slow devices). */
  delayMs?: number;
};

type ElectronPrintOptions = {
  silent?: boolean;
  printBackground?: boolean;
};

function isElectronRuntime() {
  return typeof window !== 'undefined' && (window as any).electronAPI?.isElectron === true;
}

/**
 * Prints a full HTML document.
 * - Web: opens a new window/tab and prints it.
 * - Electron: delegates to main process (Chromium print preview is often disabled in Electron).
 */
export async function printHtml(html: string, options: PrintHtmlOptions = {}) {
  const width = options.width ?? 1200;
  const height = options.height ?? 800;
  const delayMs = options.delayMs ?? 400;

  // Electron path (preferred for desktop app)
  if (isElectronRuntime()) {
    const api = (window as any).electronAPI;
    if (api?.print?.html) {
      const res = await api.print.html(html, {
        silent: false,
        printBackground: true,
      } satisfies ElectronPrintOptions);

      if (res?.success === false) {
        // eslint-disable-next-line no-console
        console.error('[print] Electron print failed:', res?.error);
      }
      return;
    }
  }

  // Web fallback
  const printWindow = window.open('', '', `width=${width},height=${height}`);
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const triggerPrint = async () => {
    try {
      await (printWindow.document as any).fonts?.ready;
    } catch {
      // ignore
    }

    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        // ignore
      }
    }, delayMs);
  };

  // If resources are already loaded, print soon; otherwise wait.
  if (printWindow.document.readyState === 'complete') {
    void triggerPrint();
  } else {
    printWindow.onload = () => {
      void triggerPrint();
    };
  }
}
