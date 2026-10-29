import {codeStyles} from './code-theme.js';

export const paperStyles = codeStyles + `
*{box-sizing:border-box} :host{display:block;color:#202b29;font:11pt/1.65 system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}
body{margin:0;background:white;color:#202b29;font:11pt/1.65 system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}
.pdf-paper{width:210mm;margin:0;padding:16mm;background:white;overflow-wrap:anywhere}
.pdf-block{display:contents} h1,h2,h3,h4,h5,h6{font-weight:650;line-height:1.35;margin:1.25em 0 .5em;break-after:avoid-page;page-break-after:avoid}
h1{font-size:24pt}h2{font-size:18pt}h3{font-size:14pt}h4{font-size:12pt}h5,h6{font-size:11pt}h1:first-child{margin-top:0}
p{margin:0 0 .8em;orphans:3;widows:3}a{color:#285d4e;text-decoration:underline;overflow-wrap:anywhere}ul,ol{padding-left:1.7em;margin:.7em 0}li{margin:.25em 0}
blockquote,.note{margin:1em 0;padding:8px 14px;border-left:3px solid #7ca08b;background:#f3f6f2}
.note-success{border-color:#5a9871}.note-warning{border-color:#cda24d}.note-danger{border-color:#c66a65}
pre{white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word;overflow:visible!important;background:#f5f6f3;padding:12px;border:1px solid #e1e5de;border-radius:4px;font-size:9pt;line-height:1.55;break-inside:auto}
code{font-family:"Cascadia Code",Consolas,"Microsoft YaHei",monospace;font-size:.9em}pre code{white-space:inherit!important;font-size:inherit}
table{border-collapse:collapse;width:100%!important;table-layout:fixed;margin:1em 0;font-size:9pt;break-inside:auto}thead{display:table-header-group}tfoot{display:table-footer-group}tr{break-inside:avoid}th,td{border:1px solid #dce2dc;padding:6px 8px;overflow-wrap:anywhere;word-break:normal}th{background:#f1f4ef;font-weight:650}
img,svg{max-width:100%!important;height:auto;max-height:240mm;object-fit:contain;break-inside:avoid}img{display:block;margin:10px auto}figure{margin:1em 0}figcaption{font-size:9pt;color:#56645e}
.katex-display{margin:1em 0;overflow:visible!important;break-inside:avoid}.katex-display>.katex{white-space:nowrap}.katex{font-size:1.05em}.katex svg{max-height:none}
details{margin:1em 0;border:1px solid #dce2dc;padding:10px 14px}summary{font-weight:600;break-after:avoid}details>div{margin-top:8px}
.fluid-label{padding:2px 5px;background:#edf3f6}.fluid-button{display:inline-block;border:1px solid #7ca08b;padding:3px 10px;border-radius:4px}
.fluid-gallery-row{display:flex;gap:8px}.fluid-gallery-row>div{flex:1;min-width:0}.fluid-gallery img{width:100%}
hr{border:0;border-top:1px solid #dce2dc;margin:1.5em 0}
@page{size:A4;margin:16mm;
@top-left{content:""}@top-center{content:""}@top-right{content:""}
@bottom-left{content:""}@bottom-center{content:counter(page);font:9pt system-ui;color:#73817d}@bottom-right{content:""}
}
@media print{html,body{background:white!important}body{margin:0}.pdf-paper{width:auto;margin:0;padding:0;box-shadow:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact;animation:none!important;transition:none!important}}
`;
