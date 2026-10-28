export const templates = {
  '折叠块': '{% fold info @展开查看 %}\n\n折叠内容\n\n{% endfold %}\n',
  '提示便签': '{% note info %}\n提示内容\n{% endnote %}\n',
  '成功便签': '{% note success %}\n提示内容\n{% endnote %}\n',
  '警告便签': '{% note warning %}\n注意事项\n{% endnote %}\n',
  '行内标签': '{% label primary @标签文字 %}',
  '按钮链接': '{% btn https://example.com, 按钮文字, 提示文字 %}',
  '勾选框': '{% cb 待办事项, false, false, false %}',
  '组图': '{% gi 2 2 %}\n![图片一](https://blog.giraffish.top/img/default.png)\n![图片二](https://blog.giraffish.top/img/default.png)\n{% endgi %}\n',
};
