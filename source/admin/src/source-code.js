import {StreamLanguage,HighlightStyle,syntaxHighlighting,defaultHighlightStyle} from '@codemirror/language';
import {tags} from '@lezer/highlight';
import {python} from '@codemirror/legacy-modes/mode/python';
import {c,cpp,java} from '@codemirror/legacy-modes/mode/clike';
import {javascript,typescript,json} from '@codemirror/legacy-modes/mode/javascript';
import {shell} from '@codemirror/legacy-modes/mode/shell';
import {powerShell} from '@codemirror/legacy-modes/mode/powershell';
import {pgSQL} from '@codemirror/legacy-modes/mode/sql';
import {yaml} from '@codemirror/legacy-modes/mode/yaml';
import {html} from '@codemirror/legacy-modes/mode/xml';
import {css} from '@codemirror/legacy-modes/mode/css';
import {r} from '@codemirror/legacy-modes/mode/r';
import {http} from '@codemirror/legacy-modes/mode/http';
import {dockerFile} from '@codemirror/legacy-modes/mode/dockerfile';
import {codeLanguage} from './code-language.js';
import {codeColors} from './code-theme.js';

const languages = Object.fromEntries(Object.entries({python,c,cpp,java,javascript,typescript,json,bash:shell,dos:shell,powershell:powerShell,sql:pgSQL,yaml,xml:html,css,r,http,dockerfile:dockerFile})
  .map(([name,parser]) => [name,StreamLanguage.define({...parser,tokenTable:{property:tags.propertyName,...parser.tokenTable}})]));
export const sourceCodeLanguage = info => languages[codeLanguage(info)] || null;
export const sourceCodeHighlight = syntaxHighlighting(HighlightStyle.define([
  ...defaultHighlightStyle.specs,
  {tag:[tags.keyword,tags.operatorKeyword],color:codeColors.keyword},
  {tag:[tags.string,tags.regexp],color:codeColors.string},
  {tag:[tags.number,tags.bool,tags.null],color:codeColors.number},
  {tag:tags.comment,color:codeColors.comment,fontStyle:'italic'},
  {tag:[tags.function(tags.variableName),tags.definition(tags.variableName)],color:codeColors.name},
  {tag:[tags.typeName,tags.className],color:codeColors.type},
  {tag:[tags.propertyName,tags.attributeName,tags.tagName],color:codeColors.property}
]));
