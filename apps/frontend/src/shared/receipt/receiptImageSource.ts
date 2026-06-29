export interface ReceiptImageSource {
  readonly id: string;
  isAvailable(): Promise<boolean>;
  acquire(): Promise<File>;
}

function acquireViaInput(configure: (input: HTMLInputElement) => void): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    configure(input);
    input.style.cssText = "position:fixed;top:-9999px;opacity:0;pointer-events:none";

    let settled = false;

    const cleanup = () => {
      window.removeEventListener("focus", onWindowFocus);
      if (input.parentNode) input.parentNode.removeChild(input);
    };

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    // After the window regains focus the file picker has closed. Wait briefly so
    // the 'change' event (if a file was picked) has time to fire first.
    const onWindowFocus = () => {
      setTimeout(
        () => settle(() => reject(Object.assign(new Error("Cancelled"), { code: "CANCELLED" }))),
        500
      );
    };

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      settle(() =>
        file
          ? resolve(file)
          : reject(Object.assign(new Error("No file selected"), { code: "NO_FILE" }))
      );
    });

    document.body.appendChild(input);
    window.addEventListener("focus", onWindowFocus, { once: true });
    input.click();
  });
}

export class FilePickerReceiptImageSource implements ReceiptImageSource {
  readonly id = "file-picker";

  isAvailable(): Promise<boolean> {
    return Promise.resolve(true);
  }

  acquire(): Promise<File> {
    return acquireViaInput(() => {});
  }
}

export class WebCameraReceiptImageSource implements ReceiptImageSource {
  readonly id = "web-camera";

  isAvailable(): Promise<boolean> {
    return Promise.resolve(
      typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia
    );
  }

  acquire(): Promise<File> {
    return acquireViaInput((input) => {
      input.setAttribute("capture", "environment");
    });
  }
}
