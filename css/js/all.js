// Every enhancement in one import: <script type="module" src=".../js/all.js"></script>
import "./machine.js";
import "./complex.js";
import "./copy.js";
import "./theme.js";
import "./toc.js";
import "./controls.js";
import "./cite.js";
import "./search.js";
import "./scroll.js";
import "./topbar.js";
// The Atlas is the largest element and few pages have one, so it loads only where one is.
// Module scripts run after the page is parsed, so one look finds it.
if (document.querySelector("ply-atlas")) import("./atlas.js");
