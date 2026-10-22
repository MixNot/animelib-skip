(() => {
  "use strict";

  const hiddenAttribute = "data-animelib-skip-hidden";
  const controls = "button, a, [role='button']";
  const comments = "[id^='comment_'], .comments, [data-comment-id], [data-comments]";
  const disableText = /^(?:отключить|убрать)\s+рекламу$/i;
  const labelText = /^(?:реклама|без рекламы)$/i;
  const normalize = text => text.replace(/\s+/g, " ").trim();
  let scheduled = false;

  function hide(element) {
    if (!element.hasAttribute(hiddenAttribute)) element.setAttribute(hiddenAttribute, "");
  }

  function clean() {
    scheduled = false;
    if (!document.body) return;

    for (const element of document.querySelectorAll(controls)) {
      if (element.closest(comments) || !disableText.test(normalize(element.textContent || ""))) continue;
      hide(element);
      // Fallback for a changed SprBlock class: only a small, explicit ad slot.
      const parent = element.parentElement;
      if (parent && !parent.querySelector("video, iframe, [data-player-container]")) {
        const hasLabel = [...parent.children].some(child =>
          child !== element && normalize(child.textContent || "").toLowerCase() === "реклама"
        );
        if (hasLabel) hide(parent);
      }
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let text;
    while ((text = walker.nextNode())) {
      if (!labelText.test(normalize(text.nodeValue || ""))) continue;
      const element = text.parentElement;
      if (!element || element.closest(`${comments}, script, style, textarea, input, [contenteditable]`)) continue;
      // Hide the label or its control, never a player or a large page wrapper.
      if (labelText.test(normalize(element.textContent || ""))) {
        const control = element.closest(controls);
        if (control && labelText.test(normalize(control.textContent || ""))) hide(control);
        else if (!element.querySelector("video, iframe, button, input")) hide(element);
      }
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(clean);
  }

  new MutationObserver(schedule).observe(document, {
    childList: true, subtree: true, characterData: true
  });
  schedule();
})();
