import React from 'react';
import {createPortal} from 'react-dom';
import {translate} from 'react-polyglot';
import {EditorToolbar as NativeToolbar} from 'decap-cms-core/dist/esm/components/Editor/EditorToolbar';
import {currentToolbar, subscribeToolbar, previewLinksEnabled, usesStudioEditor, editorLoadFailure} from './toolbar-bridge.js';

const paths = {
  exit:'M19 12H5m6-6-6 6 6 6',
  saved:'m5 12 4 4L19 6',
  publish:'M12 16V3m-5 5 5-5 5 5M4 14v7h16v-7',
  status:'M9 6h11M9 12h11M9 18h11M3 6h1M3 12h1M3 18h1',
  save:'M5 3h12l4 4v14H3V3h2m2 0v6h10V3M7 21v-8h10v8',
  saving:'M20 12a8 8 0 1 1-8-8',
  delete:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7'
};
const icon = name => <svg className="studio-toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
function actionControl(control, name) {
  const decorate = button => React.isValidElement(button) ? React.cloneElement(button, {
    children:<>{icon(name)}<span>{button.props.children}</span></>
  }) : button;
  // Keep Decap's dropdown, handlers and permissions; only decorate its trigger.
  return typeof control.props.renderButton === 'function'
    ? React.cloneElement(control, {renderButton:(...args) => decorate(control.props.renderButton(...args))})
    : decorate(control);
}
function controls(children) {
  return React.Children.toArray(children).flatMap(child => {
    if (!React.isValidElement(child)) return [];
    if (child.type === React.Fragment || (child.type === 'div' && !child.props.className && !child.props.onClick)) return controls(child.props.children);
    return [child];
  });
}
export class StudioToolbar extends NativeToolbar {
  componentDidMount() {
    if (previewLinksEnabled) super.componentDidMount();
    this.unsubscribe = subscribeToolbar(() => this.forceUpdate());
    this.compactQuery = window.matchMedia('(max-width:1200px)');
    this.resizeToolbar = () => this.forceUpdate();
    this.compactQuery.addEventListener('change', this.resizeToolbar);
    this.integrate();
    window.addEventListener('keydown', this.handleSaveShortcut, true);
  }
  componentDidUpdate(previous) {
    if (previewLinksEnabled) super.componentDidUpdate(previous);
    this.integrate();
  }
  integrate() {
    const studio = currentToolbar();
    if (this.boundStudio !== studio) {
      this.boundStudio?.root.classList.remove('studio-toolbar-integrated');
      this.boundStudio = studio;
    }
    if (!studio || studio.destroyed || studio.root.classList.contains('studio-toolbar-integrated')) return;
    studio.root.classList.add('studio-toolbar-integrated');
    studio.responsiveLayout.update();
    studio.source.requestMeasure();
    studio.metadataDock?.schedule();
  }
  handleSaveShortcut = event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== 's') return;
    const studio = currentToolbar();
    if (!studio || studio !== this.boundStudio || studio.destroyed) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat || event.isComposing) return;
    const save = studio.actionsSlot.querySelector('.studio-save');
    // Use the same control, validation and disabled state as a mouse click.
    if (save && !save.disabled) save.click();
  };
  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleSaveShortcut, true);
    this.unsubscribe?.();
    this.compactQuery?.removeEventListener('change', this.resizeToolbar);
    this.boundStudio?.root.classList.remove('studio-toolbar-integrated');
    super.componentWillUnmount();
  }
  saveControl(native) {
    const {hasChanged, isPersisting, isNewEntry, hasWorkflow, onPersist} = this.props;
    const dirty = hasChanged || isNewEntry;
    const state = isPersisting ? 'saving' : dirty ? 'dirty' : 'saved';
    const label = isPersisting ? '保存中' : dirty ? '未保存' : '已保存';
    const action = hasWorkflow ? '保存修改' : '保存并发布';
    const props = {
      className:'studio-save', 'data-save-state':state,
      title:isPersisting ? '正在保存' : dirty ? `${label} · ${action}` : label,
      'aria-label':isPersisting ? '正在保存' : dirty ? `${action}（未保存）` : label,
      'aria-keyshortcuts':'Control+s Meta+s',
      'aria-busy':Boolean(isPersisting),
      disabled:Boolean(isPersisting || (native ? native.props.disabled : !dirty)),
      children:<>{icon(state === 'saved' ? 'saved' : state === 'saving' ? 'saving' : 'save')}<span className="studio-save-label">{label}</span></>
    };
    return native ? React.cloneElement(native, props) : <button type="button" {...props} onClick={onPersist}/>;
  }
  render() {
    const studio = currentToolbar();
    if (!studio || studio.destroyed) {
      if (!usesStudioEditor(this.props.collection)) return super.render();
      const exit = React.cloneElement(super.render().props.children[0], {
        className:'studio-exit', title:'退出编辑', 'aria-label':'退出编辑',
        children:<>{icon('exit')}<span>退出</span></>
      });
      return <section className="studio-editor-loading" aria-label="工作台加载">
        <div className="studio-unified-nav">{exit}</div>
        <div className="studio-editor-loading-status" role="status" aria-busy={!editorLoadFailure}>
          {editorLoadFailure ? <><p>编辑器加载失败</p><button type="button" onClick={editorLoadFailure.retry}>重新加载</button></> : '正在加载编辑器…'}
        </div>
      </section>;
    }
    const compact = this.compactQuery?.matches ?? window.matchMedia('(max-width:1200px)').matches;
    const original = super.render().props.children;
    const exit = React.cloneElement(original[0], {
      className:'studio-exit', title:'退出编辑', 'aria-label':'退出编辑',
      children:<>{icon('exit')}<span>退出</span></>
    });
    const items = controls(this.props.hasWorkflow ? this.renderWorkflowControls() : this.renderSimpleControls());
    const save = this.saveControl(this.props.hasWorkflow ? items.shift() : null);
    const primary = [], secondary = [];
    let statusPending = Boolean(this.props.hasWorkflow && this.props.currentStatus);
    for (const item of items) {
      const deleting = typeof item.props.onClick === 'function' &&
        [this.props.onDelete, this.props.onDeleteUnpublishedChanges].includes(item.props.onClick);
      if (deleting) {
        const label = typeof item.props.children === 'string' ? item.props.children : '删除';
        secondary.push(React.cloneElement(item, {
          className:'studio-delete', title:label, 'aria-label':label,
          disabled:Boolean(this.props.isDeleting || item.props.disabled), 'aria-busy':Boolean(this.props.isDeleting),
          children:<>{icon('delete')}<span className="studio-delete-label">{compact ? label : this.props.isDeleting ? '删除中' : '删除'}</span></>
        }));
      } else if (statusPending) {
        statusPending = false;
        (compact ? secondary : primary).push(actionControl(item, 'status'));
      } else primary.push(actionControl(item, 'publish'));
    }
    return <>
      {createPortal(exit, studio.exitSlot)}
      {createPortal(<>{save}<div className="studio-publication-controls">{compact ? null : primary}</div></>, studio.actionsSlot)}
      {createPortal(<>{compact ? primary : null}{secondary}</>, compact ? studio.extraActionsSlot : studio.leadingActionsSlot)}
      {createPortal(<>{previewLinksEnabled ? original[1].props.children[1] : null}<div className="studio-account-control"><span className="studio-account-label">账户</span>{original[2]}</div></>, studio.cmsToolsSlot)}
    </>;
  }
}
export default translate()(StudioToolbar);
