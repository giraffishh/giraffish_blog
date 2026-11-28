// The interpolated field is selected when the template is inserted.
function template([before, after], placeholder) {
  return {
    source: before + placeholder + after,
    from: before.length,
    to: before.length + placeholder.length
  };
}

export const templates = {
  '折叠块': template`{% fold info @展开查看 %}\n\n${'折叠内容'}\n\n{% endfold %}\n`,
  '提示便签': template`{% note info %}\n${'提示内容'}\n{% endnote %}\n`,
  '成功便签': template`{% note success %}\n${'提示内容'}\n{% endnote %}\n`,
  '警告便签': template`{% note warning %}\n${'注意事项'}\n{% endnote %}\n`,
  '行内标签': template`{% label primary @${'标签文字'} %}`,
  '按钮链接': template`{% btn ${'https://example.com'}, 按钮文字, 提示文字 %}`,
  '勾选框': template`{% cb ${'待办事项'}, false, false, false %}`,
  '组图': template`{% gi 2 2 %}\n![图片一](${'https://blog.giraffish.top/img/default.png'})\n![图片二](https://blog.giraffish.top/img/default.png)\n{% endgi %}\n`,
};
