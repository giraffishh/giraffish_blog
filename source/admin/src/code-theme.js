export const codeColors = {
  keyword:'#8957a1', string:'#28745b', number:'#a75c19', comment:'#73817d',
  name:'#3568a8', type:'#81621a', property:'#94505e'
};
export const codeStyles = `
.hljs-keyword,.hljs-selector-tag,.hljs-meta .hljs-keyword{color:${codeColors.keyword}}
.hljs-string,.hljs-regexp,.hljs-template-tag,.hljs-addition{color:${codeColors.string}}
.hljs-number,.hljs-literal,.hljs-symbol,.hljs-bullet{color:${codeColors.number}}
.hljs-comment,.hljs-quote{color:${codeColors.comment};font-style:italic}
.hljs-title,.hljs-section,.hljs-selector-id,.hljs-selector-class{color:${codeColors.name}}
.hljs-type,.hljs-built_in,.hljs-meta{color:${codeColors.type}}
.hljs-attr,.hljs-attribute,.hljs-name,.hljs-deletion{color:${codeColors.property}}
.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:600}
`;
