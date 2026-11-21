// SPDX-License-Identifier: MIT
/** Saves data as a file through a temporary object URL (no network involved). */
export function downloadFile(data: Uint8Array | string, filename: string, mime: string): void {
  const blob = new Blob([typeof data === 'string' ? data : (data as BlobPart)], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const MAX_FILE = 20 * 1024 * 1024;

export async function readFile(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}
