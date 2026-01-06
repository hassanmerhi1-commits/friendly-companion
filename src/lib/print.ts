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

  // Web fallback - open a new window for print preview
  const printWindow = window.open('', '_blank', `width=${width},height=${height},menubar=yes,toolbar=yes,scrollbars=yes`);
  if (!printWindow) {
    // Popup might be blocked
    console.warn('[print] Popup blocked - trying alternative method');
    // Fallback: create an iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      const waitForIframeImages = async () => {
        const win = iframe.contentWindow;
        if (!win) return;
        const imgs = Array.from(win.document.images || []);
        await Promise.all(
          imgs.map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
                })
          )
        );
      };

      setTimeout(async () => {
        try {
          await waitForIframeImages();
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          // ignore
        }
        // Remove iframe after printing
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, delayMs);
    }
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const waitForImages = async () => {
    const imgs = Array.from(printWindow.document.images || []);
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
      )
    );
  };

  const triggerPrint = async () => {
    try {
      await (printWindow.document as any).fonts?.ready;
    } catch {
      // ignore
    }

    try {
      await waitForImages();
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
