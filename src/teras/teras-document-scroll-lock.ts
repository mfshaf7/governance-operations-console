let terasModalScrollLockCount = 0;
let terasModalPreviousBodyOverflow = "";
let terasModalPreviousHtmlOverflow = "";

export function lockTerasDocumentScroll() {
  if (terasModalScrollLockCount === 0) {
    terasModalPreviousBodyOverflow = document.body.style.overflow;
    terasModalPreviousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }

  terasModalScrollLockCount += 1;

  return () => {
    terasModalScrollLockCount = Math.max(0, terasModalScrollLockCount - 1);

    if (terasModalScrollLockCount === 0) {
      document.body.style.overflow = terasModalPreviousBodyOverflow;
      document.documentElement.style.overflow = terasModalPreviousHtmlOverflow;
    }
  };
}
