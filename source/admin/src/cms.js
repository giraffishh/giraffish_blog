import CMS from 'decap-cms-core';
import React from 'react';
import createClass from 'create-react-class';
import { GitGatewayBackend } from 'decap-cms-backend-git-gateway';
import StringWidget from 'decap-cms-widget-string';
import NumberWidget from 'decap-cms-widget-number';
import TextWidget from 'decap-cms-widget-text';
import ListWidget from 'decap-cms-widget-list';
import ObjectWidget from 'decap-cms-widget-object';
import BooleanWidget from 'decap-cms-widget-boolean';
import DatetimeWidget from 'decap-cms-widget-datetime';
import zh from 'decap-cms-locales/dist/esm/zh_Hans';
import en from 'decap-cms-locales/dist/esm/en';
CMS.registerBackend('git-gateway', GitGatewayBackend);
CMS.registerLocale('zh_Hans', zh);
CMS.registerLocale('en', en);
// Match config.yml. Additional widgets need both an import and registration;
// the stock Markdown editor and unrelated storage/backends are not loaded.
CMS.registerWidget([
  StringWidget.Widget(),
  NumberWidget.Widget(),
  TextWidget.Widget(),
  ListWidget.Widget(),
  ObjectWidget.Widget(),
  BooleanWidget.Widget(),
  DatetimeWidget.Widget()
]);
window.CMS = CMS;
window.h = React.createElement;
window.createClass = createClass;
export { CMS };
