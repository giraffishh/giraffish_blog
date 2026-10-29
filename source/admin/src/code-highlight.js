import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import cpp from 'highlight.js/lib/languages/cpp';
import c from 'highlight.js/lib/languages/c';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import powershell from 'highlight.js/lib/languages/powershell';
import dos from 'highlight.js/lib/languages/dos';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import r from 'highlight.js/lib/languages/r';
import http from 'highlight.js/lib/languages/http';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import {codeLanguage} from './code-language.js';

for (const [name,grammar] of Object.entries({python,cpp,c,java,javascript,typescript,json,bash,powershell,dos,sql,yaml,xml,css,r,http,dockerfile})) hljs.registerLanguage(name,grammar);
export function highlightCode(code, info) {
  const language = codeLanguage(info);
  // Explicit languages only: prose/logs remain plain and large blocks avoid
  // expensive grammar matching. Markdown-it escapes the plain-text fallback.
  if (!language || !hljs.getLanguage(language) || code.length > 100000) return '';
  try { return hljs.highlight(code,{language,ignoreIllegals:true}).value; }
  catch { return ''; }
}
