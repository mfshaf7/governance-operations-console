export function downloadConsoleBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const downloaded = downloadConsoleHref(url, fileName);

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return downloaded;
}

export function downloadConsoleHref(href: string, fileName: string) {
  if (typeof document === "undefined") {
    return false;
  }

  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  return true;
}
