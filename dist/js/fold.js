// Folded author lists: a long list in a paper header is folded in the page as built (the
// names past the fold carry .ply-authors__more), and its button shows the whole list and
// folds it again. Without this script the list shows whole (see research.css).
//   <ul class="ply-authors" data-folded> ... <li class="ply-authors__toggle">
//     <button type="button" aria-expanded="false" data-ply-fold data-more="Show all 66 authors"
//       data-less="Show fewer authors">Show all 66 authors</button></li></ul>
//   <script type="module" src=".../js/fold.js"></script>  (also part of js/all.js)

if (!window.__plyFold) {
  window.__plyFold = true;
  document.addEventListener("click", (e) => {
    const button = e.target.closest?.("[data-ply-fold]");
    const list = button?.closest(".ply-authors");
    if (!list) return;
    const open = !list.toggleAttribute("data-folded");
    button.setAttribute("aria-expanded", String(open));
    const text = open ? button.dataset.less : button.dataset.more;
    if (text) button.textContent = text;
  });
}

export {};
