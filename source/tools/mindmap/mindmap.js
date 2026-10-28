/* 界面与交互入口。依赖 mindmap-core.js；内部组件仅在本文件使用。 */
(() => {
  'use strict';

  // ── 提示与确认弹窗 ──────────────────────────────────────────
  const MindmapFeedback = (() => {
    'use strict';
    function create(document, actions) {
      const $ = (id) => document.getElementById(id),
        notice = $('appNotice'),
        dialog = $('appConfirm');
      let fingerprint = '',
        category = '',
        pending = null;
      function show(options) {
        const next = JSON.stringify(options);
        if (!notice.hidden && next === fingerprint) return;
        fingerprint = next;
        category = options.category || 'save';
        $('noticeTitle').textContent = options.title;
        $('noticeMessage').textContent = options.message;
        $('noticeActions').hidden = options.actions === false;
        $('noticeRetry').textContent = category === 'copy' ? '重试另存为' : '重试保存';
        $('noticeCopy').hidden = category === 'copy';
        notice.dataset.kind = options.kind || 'error';
        notice.dataset.placement = options.placement || 'corner';
        notice.hidden = false;
      }
      function clear(onlyCategory) {
        if (onlyCategory && onlyCategory !== category) return;
        notice.hidden = true;
        fingerprint = '';
        category = '';
      }
      function settle(value) {
        if (!pending) return;
        const resolve = pending;
        pending = null;
        if (dialog.open) dialog.close();
        resolve(value);
      }
      function confirm(options) {
        if (pending) return Promise.resolve(false);
        $('confirmTitle').textContent = options.title;
        $('confirmMessage').textContent = options.message;
        $('confirmAccept').textContent = options.accept || '继续';
        return new Promise((resolve) => {
          pending = resolve;
          dialog.showModal();
          $('confirmCancel').focus({ preventScroll: true });
        });
      }
      $('noticeClose').onclick = () => clear();
      $('noticeRetry').onclick = () => (category === 'copy' ? actions.copy() : actions.retry());
      $('noticeCopy').onclick = () => actions.copy();
      // Keep a node edit focused until the action explicitly commits it.
      $('noticeActions').addEventListener('pointerdown', (e) => e.preventDefault());
      $('confirmAccept').onclick = () => settle(true);
      $('confirmCancel').onclick = () => settle(false);
      dialog.addEventListener('cancel', (e) => {
        e.preventDefault();
        settle(false);
      });
      dialog.addEventListener('close', () => settle(false));
      return {
        show,
        clear,
        confirm,
        get confirmOpen() {
          return dialog.open;
        },
        setBusy(busy) {
          $('noticeRetry').disabled = busy;
          $('noticeCopy').disabled = busy;
        },
      };
    }
    return { create };
  })();

  // ── 分支颜色选择 ──────────────────────────────────────────
  const MindmapColor = (() => {
    'use strict';
    function rgbToHex(values) {
      if (
        values.length !== 3 ||
        values.some(
          (v) =>
            v == null ||
            String(v).trim() === '' ||
            !Number.isInteger(Number(v)) ||
            Number(v) < 0 ||
            Number(v) > 255,
        )
      )
        throw Error('RGB 请输入 0–255 的整数');
      return '#' + values.map((v) => Number(v).toString(16).padStart(2, '0')).join('');
    }
    function create(document, palette) {
      const $ = (id) => document.getElementById(id),
        dialog = $('branchColorDialog'),
        inputs = ['colorR', 'colorG', 'colorB'].map($);
      let apply = null;
      function update() {
        try {
          const value = rgbToHex(inputs.map((input) => input.value));
          $('colorPreview').style.backgroundColor = value;
          $('colorHex').textContent = value.toUpperCase();
          $('colorError').textContent = '';
          for (const button of $('colorSwatches').children)
            button.setAttribute('aria-pressed', String(button.dataset.color === value));
          return value;
        } catch (error) {
          $('colorError').textContent = error.message;
          return null;
        }
      }
      function select(value) {
        inputs.forEach(
          (input, i) => (input.value = parseInt(value.slice(1 + i * 2, 3 + i * 2), 16)),
        );
        update();
      }
      for (const value of palette) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.color = value;
        button.style.backgroundColor = value;
        button.title = value.toUpperCase();
        button.setAttribute('aria-label', '选择颜色 ' + value.toUpperCase());
        button.onclick = () => select(value);
        $('colorSwatches').append(button);
      }
      for (const input of inputs) input.addEventListener('input', update);
      $('colorForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const value = update();
        if (!value) return;
        const commit = apply;
        apply = null;
        dialog.close();
        commit?.(value);
      });
      $('colorCancel').onclick = () => dialog.close();
      dialog.addEventListener('close', () => {
        apply = null;
      });
      return {
        open(value, commit) {
          if (dialog.open) return;
          select(value);
          apply = commit;
          dialog.showModal();
          inputs[0].focus({ preventScroll: true });
        },
      };
    }
    return { create, rgbToHex };
  })();

  // ── 本地文件关联存储 ──────────────────────────────────────────
  const MindmapFileStore = (() => {
    'use strict';
    function create(indexedDB) {
      function open() {
        return new Promise((resolve, reject) => {
          if (!indexedDB) return reject(new Error('此浏览器无法保存文件关联'));
          let settled = false;
          const request = indexedDB.open('giraffish.tools.mindmap', 1);
          request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains('files'))
              request.result.createObjectStore('files');
          };
          request.onerror = () => {
            settled = true;
            reject(request.error);
          };
          request.onblocked = () => {
            settled = true;
            reject(new Error('文件关联存储被其他页面占用'));
          };
          request.onsuccess = () => {
            if (settled) request.result.close();
            else resolve(request.result);
          };
        });
      }
      async function transact(mode, action) {
        const db = await open();
        try {
          return await new Promise((resolve, reject) => {
            const transaction = db.transaction('files', mode);
            const request = action(transaction.objectStore('files'));
            transaction.oncomplete = () => resolve(request.result);
            transaction.onabort = () => reject(transaction.error || new Error('未能保存文件关联'));
            transaction.onerror = () => reject(transaction.error || request.error);
          });
        } finally {
          db.close();
        }
      }
      return {
        save: (id, handle) => transact('readwrite', (store) => store.put({ id, handle }, 'active')),
        async load(id) {
          const record = await transact('readonly', (store) => store.get('active'));
          return record?.id === id ? record.handle : null;
        },
      };
    }
    return { create };
  })();

  // ── 文件拖入 ──────────────────────────────────────────
  const MindmapFileDrop = (() => {
    'use strict';
    function create(document, window, options) {
      const $ = (id) => document.getElementById(id),
        overlay = $('fileDropOverlay');
      let depth = 0,
        lastMessage = '';
      const fileItems = (transfer) =>
        Array.from(transfer?.items || []).filter((item) => item.kind === 'file');
      const hasFiles = (transfer) =>
        Array.from(transfer?.types || []).includes('Files') || fileItems(transfer).length > 0;
      function hide() {
        depth = 0;
        overlay.hidden = true;
        lastMessage = '';
      }
      function show(transfer) {
        const blocked =
          options.blockedReason() || (fileItems(transfer).length > 1 ? '每次只打开一个文件' : '');
        const message = blocked || '导入思维导图';
        if (message !== lastMessage) {
          $('fileDropTitle').textContent = message;
          overlay.dataset.blocked = String(!!blocked);
          lastMessage = message;
        }
        overlay.hidden = false;
        transfer.dropEffect = blocked ? 'none' : 'copy';
      }
      document.addEventListener(
        'dragenter',
        (event) => {
          if (!hasFiles(event.dataTransfer)) return;
          event.preventDefault();
          depth++;
          show(event.dataTransfer);
        },
        true,
      );
      document.addEventListener(
        'dragover',
        (event) => {
          if (!hasFiles(event.dataTransfer)) return;
          event.preventDefault();
          show(event.dataTransfer);
        },
        true,
      );
      document.addEventListener(
        'dragleave',
        () => {
          if (depth > 0 && --depth === 0) hide();
        },
        true,
      );
      document.addEventListener(
        'drop',
        (event) => {
          if (!hasFiles(event.dataTransfer)) return;
          event.preventDefault();
          event.stopPropagation();
          hide();
          const blocked = options.blockedReason();
          if (blocked) {
            options.error(blocked);
            return;
          }
          const items = fileItems(event.dataTransfer),
            files = Array.from(event.dataTransfer.files || []);
          if (Math.max(items.length, files.length) !== 1) {
            options.error('每次请拖入一个 Markdown 文件');
            return;
          }
          const item = items[0];
          let file;
          try {
            file = item?.getAsFile() || files[0];
          } catch {
            options.error('无法读取这个文件，请重新拖入或点击打开');
            return;
          }
          if (!file) {
            options.error('请拖入文件，暂不支持文件夹');
            return;
          }
          // File handles must be captured synchronously while the drop event still owns the data.
          let handle = Promise.resolve(null);
          try {
            if (item?.getAsFileSystemHandle)
              handle = Promise.resolve(item.getAsFileSystemHandle())
                .then((value) => (value?.kind === 'file' ? value : null))
                .catch(() => null);
          } catch {}
          Promise.resolve(options.open(file, handle)).catch((error) =>
            options.error(error.message || '文件打开失败，请重试'),
          );
        },
        true,
      );
      document.addEventListener('dragend', hide, true);
      document.addEventListener(
        'keydown',
        (event) => {
          if (event.key === 'Escape') hide();
        },
        true,
      );
      window.addEventListener('blur', hide);
      window.addEventListener('pagehide', hide);
      return { hide };
    }
    return { create };
  })();

  // ── 触摸平移与缩放 ──────────────────────────────────────────
  const MindmapTouch = (() => {
    'use strict';
    function create(options) {
      const points = new Map(),
        now = options.now || (() => performance.now());
      let phase = 'idle',
        first = null,
        start = null,
        pinch = null,
        suppressUntil = 0;
      function suppress() {
        suppressUntil = now() + 800;
      }
      function pair() {
        const [a, b] = points.values();
        return {
          center: { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 },
          distance: Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)),
        };
      }
      function beginPinch() {
        phase = 'pinch';
        pinch = pair();
        options.onPinchStart(pinch);
      }
      function down(e) {
        if (e.pointerType !== 'touch' || !options.accept(e)) return;
        e.preventDefault();
        suppress();
        points.set(e.pointerId, e);
        if (points.size >= 2) {
          beginPinch();
          return;
        }
        first = e.pointerId;
        start = e;
        phase = 'pan';
        options.onPanStart(e);
      }
      function move(e) {
        if (!points.has(e.pointerId)) return;
        e.preventDefault();
        suppress();
        points.set(e.pointerId, e);
        if (phase === 'pinch') {
          const current = pair();
          options.onPinchMove({ ...current, factor: current.distance / pinch.distance });
        } else if (phase === 'pan' && e.pointerId === first) {
          options.onPanMove({ x: e.clientX - start.clientX, y: e.clientY - start.clientY });
        }
      }
      function up(e) {
        if (!points.has(e.pointerId)) return;
        e.preventDefault();
        suppress();
        points.delete(e.pointerId);
        if (points.size >= 2) beginPinch();
        else phase = points.size ? 'blocked' : 'idle';
      }
      function cancel() {
        points.clear();
        phase = 'idle';
        pinch = null;
        suppress();
      }
      return {
        down,
        move,
        up,
        cancel,
        get active() {
          return points.size > 0;
        },
        suppressClick(e) {
          return e.pointerType !== 'mouse' && now() < suppressUntil;
        },
      };
    }
    return { create };
  })();

  // ── 应用状态与文件保存 ──────────────────────────────────────────
  const $ = (id) => document.getElementById(id),
    NS = 'http://www.w3.org/2000/svg';
  const colors = [
    '#cf892d',
    '#357fae',
    '#2a937d',
    '#855db0',
    '#c76562',
    '#378f9d',
    '#b9618a',
    '#8c9748',
    '#5a70b3',
    '#ae7956',
    '#5f9865',
    '#aa71b8',
  ];
  // Arrange picker swatches by hue without changing persisted palette indices.
  const colorPresets = [4, 9, 0, 7, 10, 2, 5, 1, 8, 3, 11, 6].map((index) => colors[index]);
  const colorPicker = MindmapColor.create(document, colorPresets);
  const textColor = '#333333';
  const finePointerQuery = window.matchMedia('(any-pointer: fine)');
  let touchMode = window.matchMedia('(pointer: coarse)').matches && !finePointerQuery.matches;
  document.documentElement.classList.toggle('touch-ui', touchMode);
  let root = null,
    roots = [],
    nodes = [],
    visible = [],
    visibleEdges = [],
    collapsed = new Set(),
    raw = '',
    handle = null,
    mode = 'manual',
    sourceName = '新建思维导图.md',
    handleStamp = '',
    pollTimer = null,
    pollDelay = 2000,
    scale = 1,
    tx = 0,
    ty = 0,
    busy = false,
    revision = 0,
    editing = null,
    saving = false;
  // The published tool is fully static. Only a user-selected file handle is polled.
  const DRAFT_KEY = 'giraffish.tools.mindmap.draft.v1';
  const INITIAL_MAP = '# 中心主题\n';
  let draftSaved = true,
    markdownDirty = false,
    saveError = false,
    associatedText = null;
  let activeFileId = null,
    pendingHandle = null,
    pendingReason = '',
    associationSaved = true;
  const fileStore = MindmapFileStore.create(window.indexedDB);
  const feedback = MindmapFeedback.create(document, {
    retry: () => saveFromNotice(),
    copy: () => saveFromNotice(true),
  });
  let saveBusyVisible = false,
    saveBusyTimer = null;
  function rememberDraft(text = raw, name = sourceName, dirty = markdownDirty) {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          text,
          name,
          dirty,
          ...(activeFileId
            ? {
                fileId: activeFileId,
                ...(pendingReason === 'missing' ? { fileReason: 'missing' } : {}),
                ...(dirty && associatedText !== null ? { baseText: associatedText } : {}),
              }
            : {}),
        }),
      );
      draftSaved = true;
    } catch {
      draftSaved = false;
      feedback.show({
        title: '草稿暂存失败',
        message: '当前内容仅保留在此页面中，请保存到本地后再关闭页面。',
        category: 'draft',
      });
    }
    updateStorageStatus();
  }
  function updateStorageStatus() {
    const status = $('storageStatus'),
      linked = mode === 'handle' && !!handle && !pendingHandle && !saveError;
    status.dataset.warning = String(!draftSaved || !associationSaved);
    status.disabled = !(touchMode && pendingHandle) || saving;
    status.textContent = linked ? '关联本地文件' : '草稿';
    status.title =
      pendingReason === 'missing'
        ? '点击保存选择新位置并重新关联'
        : pendingHandle || saveError
          ? '点击保存尝试授权，或重新打开文件'
          : linked
            ? associationSaved
              ? '修改自动写回本地文件'
              : '当前文件已关联，但浏览器无法记住关联；刷新后需重新打开'
            : draftSaved
              ? '草稿保存在此浏览器'
              : '浏览器无法保存草稿 · 离开前请保存';
    if (touchMode) {
      status.textContent = '只读';
      status.title = pendingHandle ? '点击授权读取本地文件' : '移动端仅查看';
    }
    updateSaveControls();
  }
  function updateSaveControls() {
    const saved =
      mode === 'handle' &&
      !!handle &&
      !pendingHandle &&
      !saving &&
      !editing &&
      !saveError &&
      !markdownDirty;
    const state = saving
      ? saveBusyVisible
        ? 'saving'
        : $('save').dataset.state || 'dirty'
      : saved
        ? 'saved'
        : saveError
          ? 'error'
          : 'dirty';
    $('saveLabel').textContent =
      state === 'saving' ? '保存中' : state === 'saved' ? '已保存' : '未保存';
    $('save').dataset.state = state;
    $('save').dataset.saved = String(state === 'saved');
    feedback.setBusy(saving);
    $('save').disabled = !!editing || saving || saved;
    $('save').title = saved
      ? '修改会自动保存到本地文件'
      : pendingReason === 'missing'
        ? '选择新的保存位置并重新关联'
        : '保存 Markdown 并关联本地文件';
    $('saveAs').disabled = !!editing || saving;
  }
  function isMissingFile(error) {
    return error?.name === 'NotFoundError';
  }
  function fileErrorMessage(error, opening = false) {
    if (opening) {
      const messages = {
        NotFoundError: '文件不存在或已移动，请重新选择文件。',
        NotReadableError: '无法读取文件，请确认文件已下载到本地，且没有被其他程序占用。',
        NotAllowedError: '没有读取这个文件的权限，请重新选择并允许访问。',
        SecurityError: '浏览器未允许读取文件，请重新点击“打开”选择文件。',
      };
      return (
        messages[error?.name] ||
        (/[\u3400-\u9fff]/.test(error?.message || '')
          ? error.message
          : '无法打开文件，请确认文件可以读取后重试。')
      );
    }

    const messages = {
      NotFoundError: '原文件或保存位置已失效，请重新选择保存位置。',
      NotAllowedError: '未获得文件权限，内容已保留为草稿。可再次保存授权，或另存为副本。',
      SecurityError:
        '浏览器需要一次新的点击才能选择文件，请再点“保存”。若仍受限，请在独立浏览器窗口打开。',
      NoModificationAllowedError: '文件只读或被其他程序占用。请解除占用后重试，或另存为副本。',
      QuotaExceededError: '存储空间不足，内容仍保留在页面中。请释放空间或选择其他保存位置。',
      InvalidStateError: '文件当前无法写入，内容已保留为草稿。请重试或另存为副本。',
    };
    return (
      messages[error?.name] ||
      (/[\u3400-\u9fff]/.test(error?.message || '')
        ? error.message
        : '保存未完成，内容已保留为草稿。请重试或另存为副本。')
    );
  }
  function fileConflictError() {
    return Object.assign(
      Error('原文件已在其他地方修改。当前内容已保留，请另存为副本，或重新打开原文件。'),
      { name: 'ConflictError' },
    );
  }
  function suspendFile(error, chosen = handle || pendingHandle) {
    pendingHandle = chosen;
    mode = 'manual';
    saveError = true;
    pendingReason = isMissingFile(error)
      ? 'missing'
      : error?.name === 'NotAllowedError'
        ? 'permission'
        : error?.name === 'ConflictError'
          ? 'conflict'
          : 'error';
    updateStorageStatus();
  }
  function showFileError(error, title = '保存失败', automatic = false) {
    if (error?.name === 'AbortError' && !automatic) return;
    const message = fileErrorMessage(error, title === '打开失败');
    $('status').textContent = message;
    feedback.show({
      title: automatic ? '自动保存失败' : title,
      message,
      category: title === '打开失败' ? 'operation' : title === '另存为失败' ? 'copy' : 'save',
      actions: title !== '打开失败',
      placement: title === '打开失败' ? 'center' : 'corner',
    });
  }
  function clearSaveNotice() {
    feedback.clear('save');
    if (draftSaved) feedback.clear('draft');
  }
  async function saveFromNotice(copy = false) {
    if (saving || drag) return;
    if (editing) await saveEdit();
    if (!editing) await saveMap(copy);
  }
  async function writeFileContent(chosen, text) {
    let writer;
    try {
      writer = await chosen.createWritable();
      await writer.write(text);
      await writer.close();
    } catch (error) {
      try {
        await writer?.abort();
      } catch {}
      // Cancelling the picker is harmless; an interrupted write still needs feedback.
      if (error?.name === 'AbortError')
        throw Object.assign(Error('文件写入被中断，当前内容已保留。请重试保存。'), {
          name: 'WriteInterruptedError',
        });
      throw error;
    }
  }
  async function writeCheckedFile(chosen, expected, updated) {
    const current = await (await chosen.getFile()).text();
    if (current !== expected && current !== updated) throw fileConflictError();
    if (current !== updated) await writeFileContent(chosen, updated);
  }
  async function saveToNewLocation(saveAs = false) {
    if (!window.showSaveFilePicker) {
      downloadMarkdown(raw);
      if (!saveAs) {
        markdownDirty = false;
        rememberDraft();
      }
      $('status').textContent = '已保存副本 · 当前浏览器不支持关联本地文件';
      if (saveAs) feedback.clear('copy');
      else clearSaveNotice();
      return;
    }
    const chosen = await window.showSaveFilePicker({
      id: 'mindmap-save',
      suggestedName:
        sourceName.replace(/\.(md|markdown|txt)$/i, '') + (saveAs ? ' - 副本' : '') + '.md',
      excludeAcceptAllOption: true,
      types: [{ description: 'Markdown 思维导图 (.md)', accept: { 'text/markdown': ['.md'] } }],
    });
    if (!/\.md$/i.test(chosen.name)) throw Error('请将文件保存为 .md 格式。');
    const original = handle || pendingHandle;
    const same =
      original && typeof chosen.isSameEntry === 'function' && (await chosen.isSameEntry(original));
    if (same) {
      try {
        await writeCheckedFile(chosen, associatedText, raw);
      } catch (error) {
        suspendFile(error, original);
        rememberDraft();
        throw error;
      }
    } else await writeFileContent(chosen, raw);
    if (saveAs) {
      // A copy never replaces the association. Choosing the same entry only syncs it.
      if (same) {
        handle = original;
        mode = 'handle';
        pendingHandle = null;
        pendingReason = '';
        associatedText = raw;
        markdownDirty = false;
        saveError = false;
        handleStamp = '';
        rememberDraft();
        clearSaveNotice();
      }
      $('status').textContent = '已另存为';
      feedback.clear('copy');
      return;
    }
    // Neither the new handle nor filename becomes active before close() succeeds.
    handle = chosen;
    mode = 'handle';
    sourceName = chosen.name;
    handleStamp = '';
    pollDelay = 2000;
    associatedText = raw;
    await rememberAssociation(chosen);
    markdownDirty = false;
    saveError = false;
    rememberDraft();
    updateFileInfo();
    $('status').textContent = '已保存';
    clearSaveNotice();
  }
  async function replaceMissingFile() {
    // Only one picker attempt per explicit Save; cancellation keeps the draft.
    try {
      await saveToNewLocation(false);
    } catch (error) {
      showFileError(error);
    }
  }

  async function rememberAssociation(chosen) {
    activeFileId = null;
    pendingHandle = null;
    pendingReason = '';
    associationSaved = false;
    try {
      const id = crypto.randomUUID();
      await fileStore.save(id, chosen);
      activeFileId = id;
      associationSaved = true;
    } catch {
      // The current file remains usable even if browser persistence is unavailable.
    }
    updateStorageStatus();
  }
  async function readAssociatedFile(chosen, interactive = false) {
    const file = await chosen.getFile(),
      text = await file.text(),
      prepared = parseMarkdown(text);
    if (markdownDirty && text !== raw) {
      pendingReason = 'conflict';
      if (
        !interactive ||
        !(await feedback.confirm({
          title: '读取本地文件？',
          message: '草稿与本地文件不同。继续会替换当前草稿。',
          accept: '读取文件',
        }))
      ) {
        updateStorageStatus();
        return false;
      }
    }
    // Restore by reading the current file, never by writing the cached draft.
    apply(text, chosen.name, new Set(), false, prepared);
    handle = chosen;
    mode = 'handle';
    sourceName = chosen.name;
    pendingHandle = null;
    pendingReason = '';
    handleStamp = file.lastModified + ':' + file.size;
    pollDelay = 2000;
    markdownDirty = false;
    saveError = false;
    associatedText = text;
    rememberDraft();
    updateFileInfo();
    schedulePoll();
    clearSaveNotice();
    return true;
  }
  async function restoreAssociation() {
    if (!activeFileId) return;
    try {
      const chosen = await fileStore.load(activeFileId);
      if (!chosen) {
        activeFileId = null;
        associationSaved = false;
        rememberDraft();
        return;
      }
      pendingHandle = chosen;
      if (pendingReason !== 'missing') pendingReason = 'permission';
      if ((await chosen.queryPermission({ mode: touchMode ? 'read' : 'readwrite' })) === 'granted')
        await readAssociatedFile(chosen);
    } catch (error) {
      suspendFile(error, pendingHandle);
    } finally {
      updateStorageStatus();
    }
  }
  async function reconnectFile(saveCurrent = false) {
    if (!pendingHandle || editing || saving || drag) return;
    setSaving(true);
    const chosen = pendingHandle;
    try {
      if (
        (await chosen.requestPermission({ mode: touchMode ? 'read' : 'readwrite' })) !== 'granted'
      ) {
        suspendFile({ name: 'NotAllowedError' }, chosen);
        rememberDraft();
        showFileError({ name: 'NotAllowedError' });
        return;
      }
      if (saveCurrent && !touchMode && markdownDirty) {
        await writeCheckedFile(chosen, associatedText, raw);
        handle = chosen;
        mode = 'handle';
        sourceName = chosen.name;
        pendingHandle = null;
        pendingReason = '';
        handleStamp = '';
        associatedText = raw;
        markdownDirty = false;
        saveError = false;
        pollDelay = 2000;
        rememberDraft();
        updateFileInfo();
        $('status').textContent = '已保存';
        clearSaveNotice();
      } else await readAssociatedFile(chosen, !saveCurrent);
    } catch (error) {
      suspendFile(error, chosen);
      rememberDraft();
      if (saveCurrent && !touchMode && isMissingFile(error)) await replaceMissingFile();
      else showFileError(error);
    } finally {
      setSaving(false);
      updateStorageStatus();
      schedulePoll();
    }
  }

  async function canReplaceSource() {
    return (
      !markdownDirty ||
      (await feedback.confirm({
        title: '替换当前草稿？',
        message: '当前草稿尚未保存。继续会替换浏览器中的草稿。',
        accept: '继续替换',
      }))
    );
  }

  // ── 画布渲染与节点选择 ──────────────────────────────────────────
  const context = document.createElement('canvas').getContext('2d');
  const Core = MindmapCore;
  const editHistory = Core.createHistory();
  let hoveredId = null,
    menuTarget = null,
    menuPoint = null,
    selectedIds = new Set(),
    dropTargetId = null,
    dropInvalid = false,
    suppressContextUntil = 0;
  const perf = {
    layouts: 0,
    frames: 0,
    nodesCreated: 0,
    edgesCreated: 0,
    lastLayoutMs: 0,
    lastPaintMs: 0,
    nodesUpdated: 0,
    scenePatches: 0,
  };
  const metrics = Core.createMetricsCache((text, font) => {
    if (context.font !== font) context.font = font;
    return context.measureText(text).width;
  });
  let nodeById = new Map(),
    viewportIndex = null,
    sceneDirty = false,
    frameId = 0,
    paintedRegion = null;
  let visibleSet = new Set();
  let viewWidth = 1,
    viewHeight = 1,
    viewRect = { left: 0, top: 0 };
  const nodeCache = new Map(),
    edgeCache = new Map();
  let mountedNodes = new Set(),
    mountedEdges = new Set();
  const scene = $('scene'),
    edgeLayer = el('g'),
    nodeLayer = el('g');
  scene.append(edgeLayer, nodeLayer);
  const ghostLayer = el('g', { id: 'dragGhost', 'pointer-events': 'none' });
  scene.append(ghostLayer);

  function branchColor(n) {
    return typeof n.color === 'string' ? n.color : colors[n.color % colors.length];
  }
  function parseMarkdown(text) {
    return Core.parseMarkdown(text);
  }
  function layout() {
    const start = performance.now();
    visible = Core.layout(roots, collapsed);
    visibleSet = new Set(visible);
    visibleEdges = visible.filter((n) => n.edgePath);
    viewportIndex = visible.length > 128 ? Core.createViewportIndex(visible, visibleEdges) : null;
    perf.layouts++;
    perf.lastLayoutMs = performance.now() - start;
  }
  function el(name, attrs = {}, text) {
    const element = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function attr(element, key, value) {
    const str = String(value);
    if (element.getAttribute(key) !== str) element.setAttribute(key, str);
  }
  function makeNode() {
    perf.nodesCreated++;
    const g = el('g', {
      class: 'node',
      tabindex: touchMode ? -1 : 0,
      role: touchMode ? 'img' : 'button',
    });
    const title = el('title'),
      box = el('rect', { class: 'box', rx: 5, stroke: 'none', 'pointer-events': 'all' });
    const text = el('text', { 'font-family': 'Segoe UI, Microsoft YaHei, sans-serif' });
    g.append(title, box, text);
    return { g, title, box, text, toggle: null, signature: '', geometry: '', closed: null };
  }
  function updateNode(rec, n) {
    perf.nodesUpdated++;
    rec.layoutVersion = perf.layouts;
    const color = branchColor(n);
    const signature = [n.label, n.depth, n.color, n.side, n.w, n.h, n.children.length].join('|');
    if (rec.signature !== signature) {
      rec.signature = signature;
      rec.g.style.setProperty('--branch-color', n.parent ? color : textColor);
      attr(rec.g, 'data-id', n.id);
      attr(rec.g, 'data-side', n.side);
      attr(rec.g, 'aria-label', n.label + (touchMode ? '' : '，双击编辑'));
      rec.title.textContent = n.label;
      attr(rec.box, 'width', n.w);
      attr(rec.box, 'height', n.h);
      attr(
        rec.box,
        'fill',
        n.depth === 1 ? color + '30' : n.depth === 2 ? color + '18' : 'transparent',
      );
      const x = n.side < 0 ? n.w - 8 : n.side === 0 ? n.w / 2 : 8;
      attr(rec.text, 'x', x);
      attr(rec.text, 'y', 4 + n.font);
      attr(rec.text, 'text-anchor', n.side < 0 ? 'end' : n.side === 0 ? 'middle' : 'start');
      attr(rec.text, 'font-size', n.font);
      attr(rec.text, 'font-weight', n.weight);
      attr(rec.text, 'fill', textColor);
      rec.text.replaceChildren(
        ...n.lines.map((line, i) => el('tspan', { x, dy: i ? n.lineHeight : 0 }, line)),
      );
      if (n.children.length) {
        if (!rec.toggle) {
          rec.toggle = el('g', { class: 'toggle-control', role: 'button', tabindex: 0 });
          rec.circle = el('circle', { r: 8, class: 'toggle' });
          rec.symbol = el('text', { 'text-anchor': 'middle', 'font-size': 12 });
          rec.toggle.append(rec.circle, rec.symbol);
          rec.g.append(rec.toggle);
        }
        const x = n.side < 0 ? -9 : n.side === 0 ? n.w / 2 : n.w + 9;
        const y = n.side === 0 ? n.h + 10 : n.h / 2;
        attr(rec.toggle, 'aria-label', `折叠或展开 ${n.label}`);
        attr(rec.circle, 'cx', x);
        attr(rec.circle, 'cy', y);
        attr(rec.symbol, 'x', x);
        attr(rec.symbol, 'y', y + 4);
        attr(rec.symbol, 'fill', textColor);
        rec.closed = null;
      } else if (rec.toggle) {
        rec.toggle.remove();
        rec.toggle = null;
        rec.g.removeAttribute('aria-expanded');
      }
    }
    attr(rec.g, 'data-total', n.total);
    rec.g.classList.toggle('is-selected', selectedIds.has(n.id));
    rec.g.classList.toggle('drop-target', dropTargetId === n.id && !dropInvalid);
    rec.g.classList.toggle('drop-invalid', dropTargetId === n.id && dropInvalid);
    rec.g.classList.toggle('drag-source', !!drag?.movingIndices?.has(n.index));
    const geometry = `${n.x},${n.y}`;
    if (geometry !== rec.geometry) {
      rec.g.setAttribute('transform', `translate(${geometry})`);
      rec.geometry = geometry;
    }
    if (rec.toggle) {
      const closed = collapsed.has(n.key);
      if (closed !== rec.closed) {
        rec.closed = closed;
        attr(rec.g, 'aria-expanded', !closed);
        attr(rec.toggle, 'aria-expanded', !closed);
        rec.toggle.classList.toggle('is-collapsed', closed);
        rec.symbol.textContent = closed ? '+' : '−';
      }
    }
  }
  function trimCache(cache, mounted) {
    const limit = Math.max(1024, mounted.size * 2);
    if (cache.size <= limit) return;
    for (const [id] of cache) {
      if (!mounted.has(id)) cache.delete(id);
      if (cache.size <= limit) break;
    }
  }
  function patchScene() {
    perf.scenePatches++;
    let desiredNodes = visible,
      desiredEdges = visibleEdges;
    paintedRegion = null;
    if (viewportIndex) {
      const overscan = 180 / scale;
      const view = {
        x: -tx / scale - overscan,
        y: -ty / scale - overscan,
        right: (viewWidth - tx) / scale + overscan,
        bottom: (viewHeight - ty) / scale + overscan,
      };
      const selection = Core.selectViewport(viewportIndex, view);
      paintedRegion = { ...view, scale };
      desiredNodes = selection.nodes;
      desiredEdges = selection.edges;
      const pinned = editing?.id || document.activeElement?.closest?.('.node')?.dataset.id;
      const focused = pinned && nodeById.get(pinned);
      if (focused && visibleSet.has(focused) && !desiredNodes.includes(focused))
        desiredNodes.push(focused);
    }
    const nextNodes = new Set(),
      nextEdges = new Set();
    const newNodes = document.createDocumentFragment(),
      newEdges = document.createDocumentFragment();
    for (const n of desiredNodes) {
      nextNodes.add(n.id);
      let rec = nodeCache.get(n.id);
      if (!rec) {
        rec = makeNode();
        nodeCache.set(n.id, rec);
      }
      if (rec.layoutVersion !== perf.layouts || !mountedNodes.has(n.id)) updateNode(rec, n);
      if (!mountedNodes.has(n.id)) newNodes.append(rec.g);
    }
    for (const n of desiredEdges) {
      nextEdges.add(n.id);
      let path = edgeCache.get(n.id);
      if (!path) {
        path = el('path', { class: 'edge' });
        edgeCache.set(n.id, path);
        perf.edgesCreated++;
      }
      if (sceneDirty || !mountedEdges.has(n.id)) {
        attr(path, 'd', n.edgePath);
        attr(path, 'stroke', branchColor(n));
      }
      if (!mountedEdges.has(n.id)) newEdges.append(path);
    }
    for (const id of mountedNodes) if (!nextNodes.has(id)) nodeCache.get(id)?.g.remove();
    for (const id of mountedEdges) if (!nextEdges.has(id)) edgeCache.get(id)?.remove();
    edgeLayer.append(newEdges);
    nodeLayer.append(newNodes);
    mountedNodes = nextNodes;
    mountedEdges = nextEdges;
    trimCache(nodeCache, mountedNodes);
    trimCache(edgeCache, mountedEdges);
  }
  function render() {
    if (!root) return;
    layout();
    sceneDirty = true;
    $('count').textContent = `${visible.length} / ${nodes.length} 节点`;
    updateFileInfo();
    transform();
  }
  function updateFileInfo() {
    if ($('fileName').textContent !== sourceName) $('fileName').textContent = sourceName;
    $('fileInfo').hidden = !root;
  }
  function flushFrame() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    const start = performance.now();
    // Keep the overscanned scene until the viewport leaves its covered region.
    // Small pans/zooms need only one SVG transform, without DOM reconciliation.
    const region = paintedRegion;
    if (
      sceneDirty ||
      (viewportIndex &&
        (!region ||
          scale > region.scale * 1.5 ||
          scale < region.scale / 1.5 ||
          -tx / scale < region.x ||
          -ty / scale < region.y ||
          (viewWidth - tx) / scale > region.right ||
          (viewHeight - ty) / scale > region.bottom))
    )
      patchScene();
    sceneDirty = false;
    attr(scene, 'transform', `translate(${tx},${ty}) scale(${scale})`);
    const label = Math.round(scale * 100) + '%';
    if ($('zoomLabel').textContent !== label) $('zoomLabel').textContent = label;
    if (editing) positionEditor();
    paintGesture();
    perf.frames++;
    perf.lastPaintMs = performance.now() - start;
  }
  function transform() {
    if (!frameId) frameId = requestAnimationFrame(flushFrame);
  }
  function bounds(list) {
    return Core.bounds(list);
  }

  function toggleNodes(list, anchor) {
    if (editing || saving) return;
    const targets = list.filter((n) => n?.children.length);
    if (!targets.length) return;
    // Undo can restore a selection containing descendants hidden by a folded parent.
    // Only visible nodes have current layout coordinates suitable for camera anchoring.
    if (!visibleSet.has(anchor)) anchor = targets.find((n) => visibleSet.has(n)) || root;
    const sx = (anchor.x + anchor.w / 2) * scale + tx,
      sy = (anchor.y + anchor.h / 2) * scale + ty;
    const close = targets.some((n) => !collapsed.has(n.key));
    for (const n of targets) {
      if (close) collapsed.add(n.key);
      else collapsed.delete(n.key);
    }
    render();
    tx = sx - (anchor.x + anchor.w / 2) * scale;
    ty = sy - (anchor.y + anchor.h / 2) * scale;
    transform();
  }
  function toggleNode(n) {
    if (!n) return;
    toggleNodes(selectedIds.has(n.id) ? selectedNodes() : [n], n);
  }
  // Delegate node interaction to the scene; rerenders never add node listeners.
  scene.addEventListener('click', (e) => {
    if (touchMode) return;
    const g = e.target.closest('.node');
    if (!g) return;
    e.stopPropagation();
    if (dragMoved || editing || saving) return;
    const n = nodeById.get(g.dataset.id);
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
      e.preventDefault();
      const command = e.ctrlKey || e.metaKey;
      if (e.shiftKey && !command && !e.altKey) {
        const chosen = new Set(selectedIds);
        if (chosen.has(n.id)) chosen.delete(n.id);
        else chosen.add(n.id);
        setSelection([...chosen]);
      } else if (e.detail <= 1) {
        const action = creationAction(e);
        if (action) changeNodes(action, n);
      }
      return;
    }
    if (e.target.closest('.toggle-control')) {
      toggleNode(n);
      return;
    }
    if (n) setSelection([n.id]);
  });
  scene.addEventListener('dblclick', (e) => {
    if (touchMode) return;
    if (
      e.target.closest('.toggle-control') ||
      dragMoved ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.shiftKey
    )
      return;
    const g = e.target.closest('.node');
    if (g) {
      e.stopPropagation();
      startEdit(nodeById.get(g.dataset.id));
    }
  });
  scene.addEventListener('pointerover', (e) => {
    const g = e.target.closest('.node');
    if (g) hoveredId = g.dataset.id;
  });
  scene.addEventListener('pointerout', (e) => {
    const g = e.target.closest('.node'),
      next = e.relatedTarget?.closest?.('.node');
    if (g && g !== next && hoveredId === g.dataset.id) hoveredId = null;
  });
  scene.addEventListener('keydown', (e) => {
    if (touchMode || drag) return;
    const g = e.target.closest('.node');
    if (!g) return;
    const n = nodeById.get(g.dataset.id);
    if (
      e.target.closest('.toggle-control') &&
      e.key === 'Enter' &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !e.shiftKey
    ) {
      e.preventDefault();
      toggleNode(n);
    } else if (e.key === 'F2') {
      e.preventDefault();
      startEdit(n);
    }
  });
  function closeNodeMenu() {
    menuTarget = null;
    menuPoint = null;
    $('nodeMenu').hidden = true;
  }
  function showNodeMenu(n, x, y) {
    if (touchMode || editing || saving) return;
    if (n && !selectedIds.has(n.id)) setSelection([n.id]);
    menuTarget = n;
    menuPoint = n
      ? { x: n.x + n.w + 120, y: n.y + 80 }
      : { x: (x - viewRect.left - tx) / scale, y: (y - viewRect.top - ty) / scale };
    const menu = $('nodeMenu');
    const selected = n ? selectedNodes().sort((a, b) => a.index - b.index) : [];
    const single = selected.length === 1;
    const siblings =
      selected.length > 0 &&
      selected.every(
        (item) => item.parent === selected[0].parent && item.depth === selected[0].depth,
      );
    const allowed = {
      root: !n,
      edit: single,
      child: single,
      sibling: siblings,
      detach: !!n,
      toggle: !!n,
      color: !!n,
      delete: !!n,
    };
    for (const item of menu.querySelectorAll('button[data-action]')) {
      const action = item.dataset.action;
      item.hidden = !allowed[action];
      if (action === 'child' || action === 'sibling')
        item.dataset.nodeId = selected.at(-1)?.id || '';
    }
    menu.querySelector('.menu-separator').hidden = !n;
    menu.querySelector('[data-action="sibling"]').disabled = false;
    const topSelected = Core.selectionRoots(
      currentModel(),
      selected.map((item) => item.id),
    );
    const deleteButton = menu.querySelector('[data-action="delete"]');
    deleteButton.disabled = !!n && roots.every((r) => topSelected.includes(r));
    deleteButton.textContent = selected.some((item) => item.children.length)
      ? '删除节点及子节点'
      : '删除节点';
    menu.querySelector('[data-action="detach"]').disabled = !topSelected.some(
      (item) => item.parent,
    );
    const foldable = selected.filter((item) => item.children.length);
    const toggle = menu.querySelector('[data-action="toggle"]');
    toggle.disabled = !foldable.length;
    toggle.textContent =
      foldable.length && foldable.every((item) => collapsed.has(item.key))
        ? '展开子节点'
        : '收起子节点';
    menu.hidden = false;
    menu.style.left = Math.max(8, Math.min(x, window.innerWidth - menu.offsetWidth - 8)) + 'px';
    menu.style.top = Math.max(8, Math.min(y, window.innerHeight - menu.offsetHeight - 8)) + 'px';
    menu.tabIndex = -1;
    menu.focus({ preventScroll: true });
  }
  scene.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      touchMode ||
      touchController.active ||
      drag?.kind === 'marquee' ||
      performance.now() < suppressContextUntil
    )
      return;
    const g = e.target.closest('.node');
    showNodeMenu(g ? nodeById.get(g.dataset.id) : null, e.clientX, e.clientY);
  });
  $('nodeMenu').addEventListener('contextmenu', (e) => e.preventDefault());
  function onNodeMenuClick(e) {
    const button = e.target.closest('button[data-action]');
    if (!button || button.disabled || button.hidden) return;
    const action = button.dataset.action,
      n =
        action === 'child' || action === 'sibling'
          ? nodeById.get(button.dataset.nodeId)
          : menuTarget,
      position = menuPoint,
      ids = [...selectedIds];
    closeNodeMenu();
    if (action === 'root') {
      createRoot(position);
      return;
    }
    if (!n || nodeById.get(n.id) !== n || editing || saving) return;
    if (action === 'color') {
      openBranchColor(ids, n);
      return;
    }
    if (action === 'edit') startEdit(n);
    else if (action === 'toggle')
      toggleNodes(
        ids.map((id) => nodeById.get(id)),
        n,
      );
    else if (action === 'detach') return detachNodes(ids);
    else if (action === 'delete') return deleteSelection(ids);
    else changeNodes(action, n);
  }
  $('nodeMenu').addEventListener('click', onNodeMenuClick);
  function onNodeMenuKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      const id = menuTarget?.id;
      closeNodeMenu();
      nodeCache.get(id)?.g.focus({ preventScroll: true });
      return;
    }
    if (e.key === 'Tab') {
      closeNodeMenu();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const items = [...$('nodeMenu').querySelectorAll('button:not(:disabled):not([hidden])')];
    const current = items.indexOf(document.activeElement);
    const index =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? items.length - 1
          : current < 0
            ? e.key === 'ArrowDown'
              ? 0
              : items.length - 1
            : (current + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[index]?.focus();
  }
  $('nodeMenu').addEventListener('keydown', onNodeMenuKeydown);
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (!$('nodeMenu').hidden && !e.target.closest('#nodeMenu')) closeNodeMenu();
    },
    true,
  );
  window.addEventListener('resize', closeNodeMenu);
  window.addEventListener('blur', closeNodeMenu);
  document.addEventListener(
    'wheel',
    () => {
      if (!$('nodeMenu').hidden) closeNodeMenu();
    },
    { capture: true, passive: true },
  );
  function captureView() {
    return {
      closedIndices: nodes.filter((n) => collapsed.has(n.key)).map((n) => n.index),
      selectedIndices: [...selectedIds]
        .map((id) => nodeById.get(id)?.index)
        .filter((i) => i !== undefined),
    };
  }
  function selectedNodes() {
    return [...selectedIds].map((id) => nodeById.get(id)).filter(Boolean);
  }
  function setSelection(ids) {
    const next = new Set(ids.filter((id) => nodeById.has(id)));
    for (const id of selectedIds)
      if (!next.has(id)) nodeCache.get(id)?.g.classList.remove('is-selected');
    for (const id of next)
      if (!selectedIds.has(id)) nodeCache.get(id)?.g.classList.add('is-selected');
    selectedIds = next;
  }

  // ── 导出与视图定位 ──────────────────────────────────────────
  function buildExportSVG() {
    if (!root) return null;
    const b = bounds(visible);
    const svg = el('svg', {
      xmlns: NS,
      viewBox: `${b.x - 30} ${b.y - 30} ${b.right - b.x + 60} ${b.bottom - b.y + 60}`,
      width: b.right - b.x + 60,
      height: b.bottom - b.y + 60,
    });
    svg.append(el('style', {}, '.edge{fill:none;stroke-width:1.6;opacity:.85}.box{stroke:none}'));
    const edges = el('g'),
      boxes = el('g');
    svg.append(edges, boxes);
    // Export the complete expanded model, never the culled on-screen DOM.
    for (const n of visible) {
      if (n.edgePath)
        edges.append(el('path', { d: n.edgePath, stroke: branchColor(n), class: 'edge' }));
      const rec = makeNode();
      updateNode(rec, n);
      rec.toggle?.remove();
      boxes.append(rec.g);
    }
    return svg;
  }

  function fit(list = visible) {
    if (!list.length) return;
    const b = bounds(list),
      r = { width: viewWidth, height: viewHeight };
    if (roots.length === 1 && list.includes(root) && !root.floating) {
      const halfWidth = Math.max(Math.abs(b.x), Math.abs(b.right), 1),
        halfHeight = Math.max(Math.abs(b.y), Math.abs(b.bottom), 1);
      scale = Math.max(
        0.015,
        Math.min(1.25, (r.width - 100) / (halfWidth * 2), (r.height - 100) / (halfHeight * 2)),
      );
      tx = r.width / 2;
      ty = r.height / 2;
    } else {
      scale = Math.max(
        0.015,
        Math.min(1.25, (r.width - 100) / (b.right - b.x), (r.height - 100) / (b.bottom - b.y)),
      );
      tx = r.width / 2 - ((b.x + b.right) / 2) * scale;
      ty = r.height / 2 - ((b.y + b.bottom) / 2) * scale;
    }
    transform();
  }
  function zoom(factor, x = viewWidth / 2, y = viewHeight / 2) {
    const next = Math.max(0.015, Math.min(3, scale * factor));
    tx = x - ((x - tx) * next) / scale;
    ty = y - ((y - ty) * next) / scale;
    scale = next;
    transform();
  }

  // ── 文档加载与外部文件同步 ──────────────────────────────────────────
  function apply(text, name, closedIds = null, keepHistory = false, prepared = null) {
    if (text === raw && root && closedIds === null) {
      sourceName = name;
      updateFileInfo();
      return;
    }
    closeNodeMenu();
    const parsed = prepared || parseMarkdown(text),
      first = !root,
      selected = $('branches').value;
    if (!keepHistory) {
      editHistory.reset();
      updateHistoryControls();
    }
    Core.prepare(parsed, metrics, nodes);
    root = parsed.root;
    roots = parsed.roots;
    nodes = parsed.nodes;
    nodeById = parsed.byId;
    hoveredId = null;
    setSelection([]);
    raw = text;
    sourceName = name;
    const keys = new Set(nodes.map((n) => n.key));
    collapsed = closedIds
      ? new Set(nodes.filter((n) => closedIds.has(n.id)).map((n) => n.key))
      : new Set([...collapsed].filter((k) => keys.has(k)));
    for (const [id, rec] of nodeCache)
      if (!nodeById.has(id)) {
        rec.g.remove();
        nodeCache.delete(id);
        mountedNodes.delete(id);
      }
    for (const [id, path] of edgeCache)
      if (!nodeById.has(id)) {
        path.remove();
        edgeCache.delete(id);
        mountedEdges.delete(id);
      }
    $('empty').hidden = true;
    const select = $('branches');
    select.replaceChildren(new Option('定位分支', ''));
    const destinations = roots.length === 1 ? root.children : roots;
    destinations.forEach((n) => select.add(new Option(n.label, n.id)));
    if (destinations.some((n) => n.id === selected)) select.value = selected;
    render();
    updateHistoryControls();
    if (first) fit();
    $('status').textContent = '已更新';
  }
  function schedulePoll() {
    clearTimeout(pollTimer);
    pollTimer = null;
    if (!document.hidden && mode !== 'manual') pollTimer = setTimeout(() => refresh(), pollDelay);
  }
  async function refresh() {
    if (busy || editing || saving || drag || $('branchColorDialog')?.open) {
      schedulePoll();
      return;
    }
    busy = true;
    const version = revision;
    try {
      let text,
        stamp = null;
      if (mode === 'handle' && handle) {
        const file = await handle.getFile();
        stamp = file.lastModified + ':' + file.size;
        if (stamp === handleStamp) return;
        text = await file.text();
      } else {
        return;
      }
      if (version !== revision || editing || drag || $('branchColorDialog')?.open) return;
      apply(text, sourceName);
      saveError = false;
      associatedText = text;
      rememberDraft();
      if (stamp) handleStamp = stamp;
      pollDelay = 2000;
    } catch (error) {
      if (error.name === 'AbortError' || version !== revision) return;
      suspendFile(error, handle);
      rememberDraft();
      showFileError(error, '本地文件暂不可用');
      pollDelay = Math.min(pollDelay * 2, 30000);
      $('status').textContent = '读取失败，保留上次图';
      if (!root) $('error').textContent = fileErrorMessage(error);
    } finally {
      busy = false;
      schedulePoll();
    }
  }
  function switchSource() {
    editHistory.reset();
    updateHistoryControls();
    revision++;
    handleStamp = '';
    clearTimeout(pollTimer);
  }
  async function loadSource(text, name, newMode, newHandle, prepared) {
    switchSource();
    feedback.clear();
    handle = newHandle;
    mode = newMode;
    activeFileId = null;
    pendingHandle = null;
    pendingReason = '';
    associationSaved = true;
    associatedText = newHandle ? text : null;
    apply(text, name, new Set(), false, prepared);
    markdownDirty = false;
    saveError = false;
    if (newHandle) await rememberAssociation(newHandle);
    rememberDraft();
    fit();
    schedulePoll();
  }
  async function createDraft() {
    if (touchMode || editing || saving || drag || !(await canReplaceSource())) return;
    setSaving(true);
    try {
      await loadSource(INITIAL_MAP, '新建思维导图.md', 'manual', null);
      $('status').textContent = '已新建草稿';
    } finally {
      setSaving(false);
      schedulePoll();
    }
  }
  $('new').onclick = createDraft;
  async function readMarkdownFile(file) {
    if (!/\.(md|markdown|txt)$/i.test(file.name))
      throw Error('请选择 .md、.markdown 或 .txt 文件。');
    const text = await file.text();
    return { text, prepared: parseMarkdown(text) };
  }
  function fileDropBlockedReason() {
    if (saving) return '正在处理文件，请稍后再拖入';
    if (editing) return '请先完成节点编辑';
    if (drag) return '请先完成当前拖拽';
    if (feedback.confirmOpen || $('branchColorDialog').open || $('shortcutHelp').open)
      return '请先关闭当前弹窗';
    return '';
  }
  async function openDroppedMarkdown(file, handlePromise) {
    const blocked = fileDropBlockedReason();
    if (blocked) {
      showFileError(Error(blocked), '打开失败');
      return;
    }
    setSaving(true);
    try {
      // Validate before asking to replace a draft; a bad drop must leave the current map intact.
      const { text, prepared } = await readMarkdownFile(file);
      if (!(await canReplaceSource())) return;
      const chosen = await handlePromise;
      let writable = false;
      if (chosen && !touchMode) {
        try {
          writable = (await chosen.queryPermission({ mode: 'readwrite' })) === 'granted';
        } catch {}
      }
      await loadSource(
        text,
        file.name,
        writable ? 'handle' : 'manual',
        writable ? chosen : null,
        prepared,
      );
      if (chosen && !writable) {
        await rememberAssociation(chosen);
        pendingHandle = chosen;
        pendingReason = 'permission';
        associatedText = text;
        rememberDraft();
        updateStorageStatus();
      }
      $('status').textContent = '已打开 ' + file.name;
    } catch (error) {
      showFileError(error, '打开失败');
    } finally {
      setSaving(false);
      schedulePoll();
    }
  }
  $('open').onclick = async () => {
    if (editing || saving || drag || !(await canReplaceSource())) return;
    if (touchMode || !window.showOpenFilePicker) {
      $('file').click();
      return;
    }
    setSaving(true);
    try {
      const [chosen] = await window.showOpenFilePicker({
        types: [
          { description: 'Markdown', accept: { 'text/plain': ['.md', '.markdown', '.txt'] } },
        ],
      });
      const { text, prepared } = await readMarkdownFile(await chosen.getFile());
      await loadSource(text, chosen.name, 'handle', chosen, prepared);
    } catch (error) {
      if (error.name === 'SecurityError') $('file').click();
      else if (error.name !== 'AbortError') showFileError(error, '打开失败');
    } finally {
      setSaving(false);
      schedulePoll();
    }
  };
  $('file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file || editing || saving) return;
    setSaving(true);
    try {
      const { text, prepared } = await readMarkdownFile(file);
      await loadSource(text, file.name, 'manual', null, prepared);
      $('status').textContent = '已加载 · 编辑完成后请保存';
    } catch (error) {
      showFileError(error, '打开失败');
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };
  $('expand').onclick = () => {
    collapsed.clear();
    render();
    fit();
  };
  $('branches').onchange = (e) => {
    const n = nodeById.get(e.target.value);
    if (!n) return;
    for (let p = n; p; p = p.parent) collapsed.delete(p.key);
    render();
    const descendants = visible.filter((v) => v.index >= n.index && v.index < n.end);
    fit(descendants);
  };
  $('plus').onclick = () => zoom(1.25);
  $('minus').onclick = () => zoom(0.8);
  $('reset').onclick = () => fit();
  $('export').onclick = () => {
    const svg = buildExportSVG();
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = sourceName.replace(/\.(md|markdown|txt)$/i, '') + '.svg';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  let drag = null,
    dragMoved = false;
  const viewport = $('viewport');
  viewport.addEventListener('selectstart', (e) => {
    if (!e.target.closest('#nodeEditor')) e.preventDefault();
  });
  viewport.addEventListener('dragstart', (e) => {
    if (!e.target.closest('#nodeEditor')) e.preventDefault();
  });
  viewport.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('#nodeEditor')) e.preventDefault();
  });

  // ── 鼠标拖拽、交换与插入 ──────────────────────────────────────────
  function hitNodes(clientX, clientY) {
    const x = (clientX - viewRect.left - tx) / scale,
      y = (clientY - viewRect.top - ty) / scale;
    const candidates = viewportIndex
      ? Core.queryNodes(viewportIndex, { x, y, right: x, bottom: y })
      : visible;
    let target = null,
      source = null;
    for (const n of candidates) {
      if (x < n.x || x > n.x + n.w || y < n.y || y > n.y + n.h) continue;
      if (drag?.movingIndices?.has(n.index)) {
        if (!source || n.index > source.index) source = n;
      } else if (!target || n.index > target.index) target = n;
    }
    return { target, source };
  }
  function hitInsertion(clientX, clientY) {
    return Core.queryInsertion(
      drag.insertionIndex,
      (clientX - viewRect.left - tx) / scale,
      (clientY - viewRect.top - ty) / scale,
      scale,
    );
  }
  function paintInsertionGuide(insertion) {
    const marker = $('insertMarker');
    marker.hidden = !insertion;
    if (!insertion) return;
    const side = (insertion.upper || insertion.lower).side,
      parent = insertion.parent;
    const outer = side < 0 ? insertion.x : insertion.right,
      inner = side < 0 ? insertion.right : insertion.x;
    const end = side < 0 ? parent.x : parent.x + parent.w,
      endY = parent.y + parent.h / 2;
    const bend = Math.min(24, Math.abs(end - inner) / 2);
    attr(
      $('insertPath'),
      'd',
      `M${outer},${insertion.y}H${inner}C${inner - side * bend},${insertion.y} ${end + side * bend},${endY} ${end},${endY}`,
    );
    attr($('insertPath'), 'transform', `translate(${tx},${ty}) scale(${scale})`);
    for (const [id, x] of [
      ['insertStart', outer],
      ['insertEnd', inner],
    ]) {
      attr($(id), 'cx', x * scale + tx);
      attr($(id), 'cy', insertion.y * scale + ty);
    }
  }
  function creationAction(e) {
    if (e.shiftKey) return null;
    const command = e.ctrlKey || e.metaKey;
    return command && !e.altKey ? 'sibling' : e.altKey && !command ? 'child' : null;
  }
  function onViewportPointerDown(e) {
    if (touchMode || e.pointerType === 'touch') return;
    if (!drag) dragMoved = false;
    if (
      e.target.closest('button,#nodeEditor,.toggle-control') ||
      editing ||
      saving ||
      ![0, 2].includes(e.button) ||
      drag
    )
      return;
    dragMoved = false;
    e.preventDefault();
    closeNodeMenu();
    const selection = window.getSelection();
    if (selection?.rangeCount && selection.containsNode($('svg'), true))
      selection.removeAllRanges();
    const g = e.target.closest('.node'),
      node = g && nodeById.get(g.dataset.id);
    if (e.button === 0 && g) g.focus({ preventScroll: true });
    if (e.button === 0 && node && (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey)) return;
    let kind = e.button === 2 ? 'marquee' : node ? 'nodes' : 'pan';
    if (kind === 'nodes' && !selectedIds.has(node.id)) setSelection([node.id]);
    drag = {
      kind,
      x: e.clientX,
      y: e.clientY,
      cx: e.clientX,
      cy: e.clientY,
      tx,
      ty,
      id: e.pointerId,
      nodeId: node?.id,
      button: e.button,
      additive: e.shiftKey,
      initialSelection: [...selectedIds],
    };
  }
  viewport.addEventListener('pointerdown', onViewportPointerDown);
  function beginNodeDrag() {
    $('dragActions').hidden = false;
    drag.roots = Core.selectionRoots({ root, roots, nodes, byId: nodeById }, [...selectedIds]);
    drag.movingIndices = new Set();
    for (const n of drag.roots) {
      for (let i = n.index; i < n.end; i++) drag.movingIndices.add(i);
      const rec = nodeCache.get(n.id) || makeNode();
      if (rec.layoutVersion !== perf.layouts) updateNode(rec, n);
      const copy = rec.g.cloneNode(true);
      copy.classList.remove('drag-source', 'drop-target', 'drop-invalid');
      copy.removeAttribute('tabindex');
      copy.querySelectorAll('.toggle-control').forEach((e) => e.remove());
      ghostLayer.append(copy);
    }
    for (const n of visible)
      if (drag.movingIndices.has(n.index)) nodeCache.get(n.id)?.g.classList.add('drag-source');
    drag.insertionIndex = Core.createInsertionIndex(
      Core.siblingGaps(visible, drag.movingIndices, scale),
      drag.roots,
    );
  }
  function paintGesture() {
    if (!drag || !dragMoved) return;
    if (drag.kind === 'marquee') {
      const x1 = Math.min(drag.x, drag.cx) - viewRect.left,
        y1 = Math.min(drag.y, drag.cy) - viewRect.top;
      const x2 = Math.max(drag.x, drag.cx) - viewRect.left,
        y2 = Math.max(drag.y, drag.cy) - viewRect.top;
      const box = $('selectionRect');
      box.hidden = false;
      Object.assign(box.style, {
        left: x1 + 'px',
        top: y1 + 'px',
        width: x2 - x1 + 'px',
        height: y2 - y1 + 'px',
      });
      const region = {
        x: (x1 - tx) / scale,
        y: (y1 - ty) / scale,
        right: (x2 - tx) / scale,
        bottom: (y2 - ty) / scale,
      };
      const candidates = viewportIndex ? Core.queryNodes(viewportIndex, region) : visible;
      const enclosed = candidates
        .filter(
          (n) =>
            n.x >= region.x &&
            n.y >= region.y &&
            n.x + n.w <= region.right &&
            n.y + n.h <= region.bottom,
        )
        .map((n) => n.id);
      setSelection(drag.additive ? [...drag.initialSelection, ...enclosed] : enclosed);
    } else if (drag.kind === 'nodes') {
      const dx = (drag.cx - drag.x) / scale,
        dy = (drag.cy - drag.y) / scale;
      ghostLayer.setAttribute('transform', `translate(${dx},${dy})`);
      const zoneKey = `${viewWidth}|${viewHeight}|${viewRect.left}|${viewRect.top}`;
      if (drag.zoneKey !== zoneKey) {
        drag.zones = [...$('dragActions').children].map((element) => ({
          element,
          rect: element.getBoundingClientRect(),
        }));
        drag.zoneKey = zoneKey;
      }
      const action =
        drag.zones.find(
          ({ rect }) =>
            drag.cx >= rect.left &&
            drag.cx <= rect.right &&
            drag.cy >= rect.top &&
            drag.cy <= rect.bottom,
        )?.element.dataset.dropAction || null;
      if (action !== drag.dropAction) {
        for (const { element } of drag.zones)
          element.classList.toggle('is-active', element.dataset.dropAction === action);
        drag.dropAction = action;
      }
      const hits = action ? null : hitNodes(drag.cx, drag.cy),
        hovered = hits?.target;
      const candidate = !action && !hovered ? hitInsertion(drag.cx, drag.cy) : null;
      const originalTarget = hovered || (!candidate ? hits?.source : null);
      const noop =
        !action &&
        (candidate?.noop || (!!originalTarget && drag.movingIndices.has(originalTarget.index)));
      const insertion = noop ? null : candidate,
        target = noop ? null : originalTarget;
      drag.insertion = insertion;
      paintInsertionGuide(insertion);
      const pointerX = (drag.cx - viewRect.left - tx) / scale;
      const leftHalf = !!target?.parent && pointerX < target.x + target.w / 2;
      const sameParent = !!target?.parent && drag.roots.every((n) => n.parent === target.parent);
      const invalid = !!target && drag.movingIndices.has(target.index);
      drag.intent = noop
        ? 'noop'
        : insertion
          ? 'insert'
          : target
            ? sameParent && leftHalf
              ? 'swap'
              : 'child'
            : 'detach';
      const feedbackKey =
        (insertion
          ? (insertion.upper?.id || 'start') + '|' + (insertion.lower?.id || 'end')
          : target?.id || 'free') +
        ':' +
        drag.intent +
        ':' +
        invalid;
      if (drag.feedbackKey !== feedbackKey) {
        if (dropTargetId)
          nodeCache.get(dropTargetId)?.g.classList.remove('drop-target', 'drop-invalid');
        dropTargetId = target?.id || null;
        dropInvalid = invalid;
        if (target)
          nodeCache.get(target.id)?.g.classList.add(dropInvalid ? 'drop-invalid' : 'drop-target');
        drag.feedbackKey = feedbackKey;
      }
      const hint = $('dropHint');
      hint.hidden = !!action || noop;
      if (action || noop) {
        drag.hintKey = null;
        return;
      }
      const hintKey = feedbackKey;
      if (drag.hintKey !== hintKey) {
        hint.classList.toggle('invalid', dropInvalid);
        hint.dataset.mode = invalid ? 'invalid' : drag.intent;
        hint.textContent = invalid
          ? '不能拖入自身或子节点'
          : insertion
            ? !insertion.upper
              ? '插入「' + insertion.lower.label + '」上方'
              : !insertion.lower
                ? '插入「' + insertion.upper.label + '」下方'
                : '插入「' + insertion.upper.label + '」和「' + insertion.lower.label + '」之间'
            : target
              ? drag.intent === 'swap'
                ? '与「' + target.label + '」交换位置'
                : '成为「' + target.label + '」的子节点'
              : '独立到此处';
        drag.hintWidth = hint.offsetWidth;
        drag.hintHeight = hint.offsetHeight;
        drag.hintKey = hintKey;
      }
      hint.style.left =
        Math.max(8, Math.min(viewWidth - drag.hintWidth - 8, drag.cx - viewRect.left + 16)) + 'px';
      hint.style.top =
        Math.max(8, Math.min(viewHeight - drag.hintHeight - 8, drag.cy - viewRect.top + 20)) + 'px';
    }
  }
  window.addEventListener('pointermove', (e) => {
    if (touchMode || e.pointerType === 'touch' || !drag || e.pointerId !== drag.id) return;
    drag.cx = e.clientX;
    drag.cy = e.clientY;
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    if (dragMoved || Math.abs(dx) + Math.abs(dy) > 5) {
      if (!dragMoved) {
        dragMoved = true;
        viewport.setPointerCapture(e.pointerId);
        if (drag.kind === 'nodes') beginNodeDrag();
        viewport.classList.add('dragging');
      }
      e.preventDefault();
      if (drag.kind === 'pan') {
        tx = drag.tx + dx;
        ty = drag.ty + dy;
      }
      transform();
    }
  });
  function clearGesture() {
    const old = drag;
    drag = null;
    viewport.classList.remove('dragging');
    if (old && viewport.hasPointerCapture(old.id)) viewport.releasePointerCapture(old.id);
    $('selectionRect').hidden = true;
    $('dropHint').hidden = true;
    $('insertMarker').hidden = true;
    ghostLayer.replaceChildren();
    ghostLayer.removeAttribute('transform');
    $('dragActions').hidden = true;
    for (const zone of $('dragActions').children) zone.classList.remove('is-active');
    for (const id of mountedNodes)
      nodeCache.get(id)?.g.classList.remove('drag-source', 'drop-target', 'drop-invalid');
    dropTargetId = null;
    dropInvalid = false;
    return old;
  }
  function onViewportPointerUp(e) {
    if (touchMode || e.pointerType === 'touch' || !drag || e.pointerId !== drag.id) return;
    drag.cx = e.clientX;
    drag.cy = e.clientY;
    paintGesture();
    const moved = dragMoved,
      target = dropTargetId,
      invalid = dropInvalid,
      old = clearGesture();
    if (old.kind === 'marquee') {
      if (old.button === 2) {
        suppressContextUntil = performance.now() + 700;
        if (!moved) {
          showNodeMenu(old.nodeId ? nodeById.get(old.nodeId) : null, e.clientX, e.clientY);
        }
      }
    } else if (old.kind === 'nodes' && moved && !invalid) {
      if (old.intent === 'noop' || old.dropAction === 'cancel') {
        setSelection(old.initialSelection);
        return;
      }
      if (old.dropAction === 'delete') {
        deleteSelection(old.roots.map((n) => n.id));
        return;
      }
      if (old.intent === 'insert' && old.insertion) {
        return commitInsert(
          old.roots.map((n) => n.id),
          old.insertion.upper?.id ?? null,
          old.insertion.lower?.id ?? null,
        );
      }
      if (old.intent === 'swap') {
        return commitSwap(
          old.roots.map((n) => n.id),
          target,
        );
      }
      const positions = {};
      for (const n of old.roots)
        positions[n.id] = { x: n.x + (old.cx - old.x) / scale, y: n.y + (old.cy - old.y) / scale };
      return commitMove(
        old.roots.map((n) => n.id),
        target,
        positions,
      );
    } else if (old.kind === 'pan' && !moved && !old.additive) {
      setSelection(old.nodeId ? [old.nodeId] : []);
    }
  }
  window.addEventListener('pointerup', onViewportPointerUp);
  function cancelGesture() {
    if (!drag) return;
    const old = clearGesture();
    if (old.kind === 'pan') {
      tx = old.tx;
      ty = old.ty;
      transform();
    }
    setSelection(old.initialSelection);
    dragMoved = true;
  }
  window.addEventListener('pointercancel', cancelGesture);
  viewport.addEventListener('lostpointercapture', () => {
    if (drag) cancelGesture();
  });
  window.addEventListener('blur', cancelGesture);
  viewport.addEventListener(
    'wheel',
    (e) => {
      if (e.target.closest('.zoom,#nodeEditor')) return;
      e.preventDefault();
      if (drag) return;
      zoom(Math.exp(-e.deltaY * 0.0015), e.clientX - viewRect.left, e.clientY - viewRect.top);
    },
    { passive: false },
  );

  // ── 触摸与鼠标键盘切换 ──────────────────────────────────────────
  let touchPanView = null,
    pinchView = null;
  function enablePointerEditing() {
    if (!touchMode) return;
    // Once a mouse or keyboard is used, touching the canvas must not revoke editing.
    touchMode = false;
    document.documentElement.classList.remove('touch-ui');
    for (const [id, rec] of nodeCache) {
      rec.g.setAttribute('tabindex', '0');
      rec.g.setAttribute('role', 'button');
      const node = nodeById.get(id);
      if (node) rec.g.setAttribute('aria-label', node.label + '，双击编辑');
    }
    updateHistoryControls();
    updateViewport();
  }
  function onEditingPointer(e) {
    if (e.isTrusted && e.pointerType === 'mouse' && !e.sourceCapabilities?.firesTouchEvents)
      enablePointerEditing();
  }
  function onEditingKey(e) {
    if (!e.isTrusted || e.isComposing || ['Unidentified', 'Process', 'Dead'].includes(e.key))
      return;
    // A key outside a text field is evidence of a keyboard, not the touch IME.
    if (!e.target.closest('input,textarea,[contenteditable="true"]')) enablePointerEditing();
  }
  document.addEventListener('pointerdown', onEditingPointer, true);
  document.addEventListener('pointermove', onEditingPointer, true);
  document.addEventListener('keydown', onEditingKey, true);
  finePointerQuery.addEventListener('change', (e) => {
    if (e.matches) enablePointerEditing();
  });
  const touchController = MindmapTouch.create({
    accept(e) {
      return !editing && !saving && !e.target.closest('button,#nodeEditor,.zoom,#fileInfo');
    },
    onPanStart() {
      closeNodeMenu();
      touchPanView = { tx, ty };
    },
    onPanMove(delta) {
      tx = touchPanView.tx + delta.x;
      ty = touchPanView.ty + delta.y;
      transform();
    },
    onPinchStart({ center }) {
      closeNodeMenu();
      pinchView = {
        scale,
        x: (center.x - viewRect.left - tx) / scale,
        y: (center.y - viewRect.top - ty) / scale,
      };
    },
    onPinchMove({ center, factor }) {
      scale = Math.max(0.015, Math.min(3, pinchView.scale * factor));
      tx = center.x - viewRect.left - pinchView.x * scale;
      ty = center.y - viewRect.top - pinchView.y * scale;
      transform();
    },
  });
  viewport.addEventListener('pointerdown', touchController.down, { capture: true, passive: false });
  window.addEventListener('pointermove', touchController.move, { passive: false });
  window.addEventListener('pointerup', touchController.up, { passive: false });
  window.addEventListener('pointercancel', (e) => {
    if (e.pointerType === 'touch') touchController.cancel();
  });
  window.addEventListener('blur', touchController.cancel);
  function suppressTouchClick(e) {
    if (
      !e.target.closest('button,#nodeEditor,.zoom,#fileInfo') &&
      touchController.suppressClick(e)
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }
  viewport.addEventListener('click', suppressTouchClick, true);
  viewport.addEventListener('dblclick', suppressTouchClick, true);

  // ── 结构操作与节点编辑 ──────────────────────────────────────────
  function currentModel() {
    return { root, roots, nodes, byId: nodeById };
  }
  function setSaving(value) {
    saving = value;
    clearTimeout(saveBusyTimer);
    saveBusyTimer = null;
    saveBusyVisible = false;
    if (value) {
      revision++;
      saveBusyTimer = setTimeout(() => {
        if (saving) {
          saveBusyVisible = true;
          updateSaveControls();
        }
      }, 150);
    }
    updateHistoryControls();
  }
  function mappedView(view, change, selectedIndices = [], expandIndex = null) {
    return {
      closedIndices: view.closedIndices
        .map(change.remap)
        .filter((i) => i != null && i !== expandIndex),
      selectedIndices,
    };
  }
  async function commitStructure(build) {
    if (touchMode || editing || saving || drag) return;
    const before = raw,
      beforeView = captureView();
    try {
      const operation = build(before, currentModel(), beforeView),
        { change, afterView } = operation;
      if (change.text === before) return;
      setSaving(true);
      const updated = await persistSource(before, change.text);
      applyLocalChange(updated, null, afterView, updated === change.text ? change.model : null);
      editHistory.record(before, updated, null, { before: beforeView, after: afterView });
      if (operation.revealIndex != null) revealNode(nodeById.get('n' + operation.revealIndex));
      $('status').textContent = operation.status;
      setSaving(false);
      if (operation.editIndex != null) {
        flushFrame();
        startEdit(nodeById.get('n' + operation.editIndex), true);
      }
    } catch (error) {
      $('status').textContent = error.message;
      feedback.show({
        title: '操作未完成',
        message: error.message,
        category: 'operation',
        actions: false,
      });
    } finally {
      setSaving(false);
    }
  }
  function openBranchColor(ids, node) {
    const expected = raw;
    colorPicker.open(branchColor(node), (color) => {
      if (raw !== expected) {
        feedback.show({
          title: '导图已变化',
          message: '请重新选择要更改颜色的分支。',
          category: 'operation',
          actions: false,
        });
        return;
      }
      void commitStructure((text, model, view) => {
        const change = Core.setBranchColor(text, model, ids, color);
        return {
          change,
          afterView: mappedView(view, change, view.selectedIndices.map(change.remap)),
          status: '已更改分支颜色',
        };
      });
    });
  }
  function commitSwap(ids, targetId) {
    return commitStructure((text, model, view) => {
      const change = Core.swapSiblings(text, model, ids, targetId);
      return {
        change,
        afterView: mappedView(view, change, change.movedIndices),
        status: '已交换节点位置',
      };
    });
  }
  function commitInsert(ids, upperId, lowerId) {
    return commitStructure((text, model, view) => {
      const change = Core.insertSubtrees(text, model, ids, upperId, lowerId);
      return {
        change,
        afterView: mappedView(view, change, change.movedIndices, change.expandIndex),
        status: '已插入节点',
      };
    });
  }
  function commitMove(ids, targetId, positions) {
    return commitStructure((text, model, view) => {
      let change = Core.moveSubtrees(text, model, ids, targetId, positions);
      if (targetId === null)
        change = Core.settleRootPositions(change, change.movedIndices, metrics);
      return {
        change,
        afterView: mappedView(view, change, change.movedIndices, change.expandIndex),
        revealIndex: targetId === null ? change.movedIndices[0] : null,
        status: targetId ? '已调整父子关系' : '已独立节点',
      };
    });
  }
  function detachNodes(ids) {
    const moving = Core.selectionRoots(currentModel(), ids).filter((n) => n.parent);
    if (!moving.length) return;
    const positions = Object.fromEntries(moving.map((n) => [n.id, { x: n.x, y: n.y }]));
    return commitMove(
      moving.map((n) => n.id),
      null,
      positions,
    );
  }
  function createRoot(position) {
    if (!position) return;
    return commitStructure((text, model, view) => {
      let change = Core.addRoot(text, model, position);
      change = Core.settleRootPositions(change, [change.targetIndex], metrics);
      return {
        change,
        afterView: mappedView(view, change, [change.targetIndex]),
        editIndex: change.targetIndex,
        revealIndex: change.targetIndex,
        status: '已新增根节点',
      };
    });
  }
  function deleteSelection(ids) {
    if (!Core.selectionRoots({ byId: nodeById }, ids).length) return;
    return commitStructure((text, model, view) => {
      const change = Core.deleteSubtrees(text, model, ids);
      return { change, afterView: mappedView(view, change), status: '已删除选中节点及子节点' };
    });
  }
  function changeNodes(action, n) {
    if (!n) return;
    return commitStructure((text, model, view) => {
      let change = Core.changeStructure(text, model, n.id, action);
      if (action === 'sibling' && !n.parent)
        change = Core.settleRootPositions(change, [change.targetIndex], metrics);
      const created = action !== 'delete';
      return {
        change,
        afterView: mappedView(view, change, [change.targetIndex], change.remap(change.expandIndex)),
        editIndex: created ? change.targetIndex : null,
        revealIndex: created ? change.targetIndex : null,
        status: created ? '已新增节点' : '已删除节点及子节点',
      };
    });
  }

  function positionEditor() {
    if (!editing) return;
    const n = nodeById.get(editing.id);
    if (!n) return;
    const box = $('nodeEditor'),
      input = $('nodeText');
    // Use the same local coordinates and scale as the SVG text. Never pan or zoom on edit.
    box.style.left = (n.x + 8) * scale + tx + 'px';
    box.style.top = (n.y + 2) * scale + ty + 'px';
    box.style.width = n.w - 16 + 'px';
    box.style.transform = `scale(${scale})`;
    input.style.fontSize = n.font + 'px';
    input.style.lineHeight = n.lineHeight + 'px';
    input.style.textAlign = n.side < 0 ? 'right' : n.side === 0 ? 'center' : 'left';
    const rec = nodeCache.get(n.id);
    if (rec) rec.text.style.visibility = 'hidden';
  }
  function sizeEditor(event) {
    if (!editing) return;
    const n = nodeById.get(editing.id),
      input = $('nodeText');
    if (event?.type === 'input') {
      editing.saveFailed = false;
      $('editError').textContent = '';
    }
    input.style.height = '0px';
    input.style.height = Math.max(n.lines.length * n.lineHeight, input.scrollHeight) + 'px';
  }
  function hideEditor() {
    const id = editing?.id;
    if (id) nodeCache.get(id)?.text.style.removeProperty('visibility');
    editing = null;
    $('nodeEditor').hidden = true;
    updateHistoryControls();
  }
  function startEdit(n, selectAll = false) {
    if (touchMode || !n || saving) return;
    if (editing) {
      $('nodeText').focus();
      return;
    }
    setSelection([n.id]);
    revision++;
    editing = { id: n.id, line: n.line, expected: raw, label: n.label };
    updateHistoryControls();
    $('nodeText').value = n.label;
    $('editError').textContent = '';
    $('nodeEditor').hidden = false;
    positionEditor();
    sizeEditor();
    $('nodeText').focus({ preventScroll: true });
    $('nodeText').setSelectionRange(selectAll ? 0 : n.label.length, n.label.length);
  }
  function revealNode(n) {
    if (!n) return;
    const x = n.x * scale + tx,
      y = n.y * scale + ty,
      w = n.w * scale,
      h = n.h * scale,
      pad = 32;
    if (w > viewWidth - 2 * pad) tx += viewWidth / 2 - x - w / 2;
    else if (x < pad) tx += pad - x;
    else if (x + w > viewWidth - pad) tx += viewWidth - pad - x - w;
    if (h > viewHeight - 2 * pad) ty += viewHeight / 2 - y - h / 2;
    else if (y < pad) ty += pad - y;
    else if (y + h > viewHeight - pad) ty += viewHeight - pad - y - h;
    transform();
  }
  function endEdit() {
    if (saving) return;
    if (editing && !editing.saveFailed && !$('nodeText').value.trim()) return saveEdit();
    const id = editing?.id;
    hideEditor();
    nodeCache.get(id)?.g.focus({ preventScroll: true });
  }
  function editedSource(text, line, label) {
    if (!label.trim() || /[\r\n]/.test(label) || label.includes('<!--') || label.includes('-->'))
      throw Error('请输入非空的单行节点名称');
    const lines = text.split('\n'),
      old = lines[line - 1];
    // Preserve the Markdown hierarchy and every unrelated line.
    const heading = old?.match(/^(?:\uFEFF)?(#+)[ \t]+/);
    if (!heading) throw Error('找不到对应标题，请重新读取');
    lines[line - 1] =
      (old.startsWith('\uFEFF') ? '\uFEFF' : '') +
      heading[1] +
      ' ' +
      label.trim() +
      (old.endsWith('\r') ? '\r' : '');
    const result = lines.join('\n'),
      tree = parseMarkdown(result),
      node = tree.nodes.find((n) => n.line === line);
    if (tree.nodes.length !== nodes.length || node?.label !== label.trim())
      throw Error('名称不能包含 Markdown 注释、换行或末尾标题标记');
    return { text: result, model: tree };
  }

  // ── 保存与撤销重做 ──────────────────────────────────────────
  function downloadMarkdown(text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' })),
      a = document.createElement('a');
    a.href = url;
    a.download = sourceName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  async function saveMap(saveAs = false) {
    if (touchMode || editing || saving || drag || !root) return;
    if (!saveAs && pendingHandle && pendingReason !== 'missing') {
      await reconnectFile(true);
      return;
    }
    const useCurrent = !saveAs && mode === 'handle' && handle && pendingReason !== 'missing';
    setSaving(true);
    try {
      if (useCurrent) {
        await writeCheckedFile(handle, associatedText ?? raw, raw);
        associatedText = raw;
        markdownDirty = false;
        saveError = false;
        pendingReason = '';
        if (!activeFileId) await rememberAssociation(handle);
        rememberDraft();
        $('status').textContent = '已保存';
        clearSaveNotice();
      } else await saveToNewLocation(saveAs);
    } catch (error) {
      if (useCurrent) {
        suspendFile(error, handle);
        rememberDraft();
        if (isMissingFile(error)) {
          await replaceMissingFile();
          return;
        }
      }
      showFileError(error, saveAs ? '另存为失败' : '保存失败');
    } finally {
      setSaving(false);
      updateStorageStatus();
      schedulePoll();
    }
  }
  $('save').onclick = () => saveMap();
  $('saveAs').onclick = () => saveMap(true);
  $('storageStatus').onclick = () => reconnectFile();
  function updateHistoryControls() {
    updateStorageStatus();
    $('new').disabled = !!editing || saving;
    $('open').disabled = !!editing || saving;
    $('undo').disabled = !editHistory.canUndo || !!editing || saving;
    $('redo').disabled = !editHistory.canRedo || !!editing || saving;
  }
  async function persistSource(expected, updated) {
    if (touchMode) throw Error('移动端为只读模式');
    if (mode === 'handle' && handle) {
      try {
        await writeCheckedFile(handle, expected, updated);
        markdownDirty = false;
        saveError = false;
        associatedText = updated;
        clearSaveNotice();
      } catch (error) {
        // Automatic writes never open a picker or discard the new edit.
        if (associatedText === null) associatedText = expected;
        suspendFile(error, handle);
        markdownDirty = true;
        showFileError(error, '保存失败', true);
      }
    } else markdownDirty = true;
    rememberDraft(updated);
    return updated;
  }
  function applyLocalChange(updated, id, viewState = null, prepared = null) {
    const target = nodeById.get(id),
      anchor = target && visibleSet.has(target) ? target : root;
    const sx = anchor.x * scale + tx,
      sy = anchor.y * scale + ty;
    const chosen =
      viewState?.selectedIndices ??
      [...selectedIds].map((id) => nodeById.get(id)?.index).filter((i) => i !== undefined);
    const closedIds = viewState
      ? new Set(viewState.closedIndices.map((i) => 'n' + i))
      : new Set(nodes.filter((n) => collapsed.has(n.key)).map((n) => n.id));
    apply(updated, sourceName, closedIds, true, prepared);
    setSelection(chosen.map((i) => 'n' + i));
    if (id !== null) {
      const next = nodeById.get(anchor.id) || root;
      tx = sx - next.x * scale;
      ty = sy - next.y * scale;
    }
    transform();
  }
  async function saveEdit() {
    if (!editing || saving) return;
    const edit = editing,
      label = $('nodeText').value.trim();
    if (label === edit.label) {
      endEdit();
      return;
    }
    const deleting = !label,
      n = nodeById.get(edit.id);
    // A map must retain one root. Clearing its name restores the previous title.
    if (deleting && n && !n.parent && roots.length === 1) {
      hideEditor();
      nodeCache.get(n.id)?.g.focus({ preventScroll: true });
      return;
    }
    try {
      const beforeView = captureView(),
        change = deleting
          ? Core.deleteSubtrees(edit.expected, currentModel(), [edit.id])
          : editedSource(edit.expected, edit.line, label);
      setSaving(true);
      $('nodeText').disabled = true;
      $('editError').textContent = '';
      const normalized = Core.normalizedSource(change.text, change.model);
      const updated = await persistSource(edit.expected, normalized);
      const id = deleting ? null : edit.id,
        afterView = deleting ? mappedView(beforeView, change) : null;
      hideEditor();
      applyLocalChange(updated, id, afterView, updated === change.text ? change.model : null);
      editHistory.record(edit.expected, updated, id, { before: beforeView, after: captureView() });
      $('status').textContent =
        mode === 'manual' ? '已应用 · 请保存 Markdown 留存' : deleting ? '已删除空节点' : '已保存';
    } catch (error) {
      edit.saveFailed = true;
      $('editError').textContent = error.message;
      positionEditor();
    } finally {
      setSaving(false);
      $('nodeText').disabled = false;
      if (editing) $('nodeText').focus({ preventScroll: true });
    }
  }
  async function travelHistory(direction) {
    if (touchMode || editing || saving) return;
    const entry = editHistory.peek(direction);
    if (!entry) return;
    const expected = direction === 'undo' ? entry.after : entry.before;
    const target = direction === 'undo' ? entry.before : entry.after;
    if (raw !== expected) {
      editHistory.reset();
      updateHistoryControls();
      return;
    }
    try {
      const prepared = parseMarkdown(target);
      setSaving(true);
      const updated = await persistSource(expected, target);
      applyLocalChange(
        updated,
        entry.id,
        entry.view?.[direction === 'undo' ? 'before' : 'after'],
        updated === target ? prepared : null,
      );
      editHistory.complete(direction, entry);
      $('status').textContent = direction === 'undo' ? '已撤销' : '已重做';
    } catch (error) {
      $('status').textContent = error.message;
      feedback.show({
        title: '操作未完成',
        message: error.message,
        category: 'operation',
        actions: false,
      });
    } finally {
      setSaving(false);
    }
  }
  $('undo').onclick = () => travelHistory('undo');
  $('redo').onclick = () => travelHistory('redo');

  // ── 快捷键与帮助 ──────────────────────────────────────────
  const SHORTCUT_PLATFORM_KEY = 'giraffish.tools.mindmap.shortcuts.v1';
  const shortcutKeys = {
    command: { win: ['Ctrl', 'Control'], mac: ['⌘', 'Command'] },
    alt: { win: ['Alt', 'Alt'], mac: ['⌥', 'Option'] },
    shift: { win: ['Shift', 'Shift'], mac: ['⇧', 'Shift'] },
    tab: { win: ['Tab', 'Tab'], mac: ['⇥', 'Tab'] },
    enter: { win: ['Enter', 'Enter'], mac: ['↩', 'Return'] },
    delete: { win: ['Delete', 'Delete / Backspace'], mac: ['⌫', 'Delete / Backspace'] },
  };
  // Draw Mac key symbols directly so Safari cannot substitute emoji or font glyphs.
  const shortcutKeyPaths = {
    command: 'M8 8H5a3 3 0 1 1 3-3v14a3 3 0 1 1-3-3h14a3 3 0 1 1-3 3V5a3 3 0 1 1 3 3H8',
    alt: 'M3 5h6l6 14h6M15 5h6',
    shift: 'm12 3 9 9h-5v9H8v-9H3z',
    tab: 'M3 12h17m-6-6 6 6-6 6M21 4v16',
    enter: 'M20 5v7H4m6-6-6 6 6 6',
    delete: 'M9 5h12v14H9L2 12zM12 9l6 6m0-6-6 6',
  };
  function detectShortcutPlatform(environment = navigator) {
    const platform =
      environment.userAgentData?.platform || environment.platform || environment.userAgent || '';
    return /Mac|iPhone|iPad|iPod/i.test(platform) ? 'mac' : 'win';
  }
  function initialShortcutPlatform(environment = navigator, storage) {
    try {
      const saved = (storage || localStorage).getItem(SHORTCUT_PLATFORM_KEY);
      if (saved === 'win' || saved === 'mac') return saved;
    } catch {}
    return detectShortcutPlatform(environment);
  }
  function setShortcutPlatform(platform, remember = false) {
    if (platform !== 'win' && platform !== 'mac') return;
    $('shortcutPlatform').dataset.platform = platform;
    $('shortcutWin').checked = platform === 'win';
    $('shortcutMac').checked = platform === 'mac';
    for (const key of document.querySelectorAll('[data-shortcut-key]')) {
      const [label, title] = shortcutKeys[key.dataset.shortcutKey][platform];
      key.textContent = label;
      key.title = title;
      key.setAttribute('aria-label', title);
      if (platform === 'mac')
        key.innerHTML =
          '<svg class="shortcut-key-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="' +
          shortcutKeyPaths[key.dataset.shortcutKey] +
          '"/></svg>';
    }
    const command = shortcutKeys.command[platform][0],
      shift = shortcutKeys.shift[platform][0];
    $('undo').title = `撤销（${command}+Z）`;
    $('redo').title = `重做（${command}+${shift}+Z）`;
    $('export').title = `导出 SVG（${command}+S）`;
    if (remember) {
      try {
        localStorage.setItem(SHORTCUT_PLATFORM_KEY, platform);
      } catch {}
    }
  }
  function initializeShortcutPlatform() {
    setShortcutPlatform(initialShortcutPlatform());
    $('shortcutWin').onchange = () => setShortcutPlatform('win', true);
    $('shortcutMac').onchange = () => setShortcutPlatform('mac', true);
  }
  initializeShortcutPlatform();

  $('shortcuts').onclick = () => {
    $('shortcutHelp').showModal();
    $('shortcutTitle').focus({ preventScroll: true });
  };
  $('closeHelp').onclick = () => $('shortcutHelp').close();
  async function exportFromShortcut() {
    if (saving || drag) return;
    if (editing) await saveEdit();
    // A failed node edit stays open; do not export stale content.
    if (editing || saving || drag) return;
    $('export').click();
  }
  function onDocumentKeydown(e) {
    if (touchMode || e.defaultPrevented || e.isComposing) return;
    if (feedback.confirmOpen || $('branchColorDialog')?.open) {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (!e.repeat && !$('shortcutHelp').open && $('nodeMenu').hidden) void exportFromShortcut();
      return;
    }
    if ($('shortcutHelp').open || !$('nodeMenu').hidden) return;
    if (e.key === 'Escape' && drag) {
      e.preventDefault();
      cancelGesture();
      return;
    }
    if (drag) {
      e.preventDefault();
      return;
    }
    if (editing || e.target.closest('input,textarea,[contenteditable="true"]')) return;
    if (e.key === 'Tab' || e.key === 'Enter') {
      const focused = e.target.closest('.node')?.dataset.id;
      const n = nodeById.get(selectedIds.size ? [...selectedIds].at(-1) : focused || hoveredId);
      const action = e.key === 'Enter' ? creationAction(e) : null;
      if (n && action) {
        e.preventDefault();
        if (!e.repeat) changeNodes(action, n);
        return;
      }
      const canvasTarget =
        focused || e.target === document.body || e.target === viewport || e.target === $('svg');
      const foldable =
        n &&
        (n.children.length ||
          (selectedIds.has(n.id) &&
            [...selectedIds].some((id) => nodeById.get(id)?.children.length)));
      if (
        e.key === 'Tab' &&
        canvasTarget &&
        foldable &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        if (!e.repeat) toggleNode(n);
        return;
      }
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      void travelHistory(e.shiftKey ? 'redo' : 'undo');
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if (!['Delete', 'Backspace'].includes(e.key) || drag) return;
    const ids = selectedIds.size ? [...selectedIds] : hoveredId ? [hoveredId] : [];
    if (!ids.length) return;
    e.preventDefault();
    if (!e.repeat) deleteSelection(ids);
  }
  document.addEventListener('keydown', onDocumentKeydown);
  $('nodeText').oninput = sizeEditor;
  $('nodeText').onblur = () => {
    if (editing && !saving) saveEdit();
  };
  $('nodeText').onkeydown = (e) => {
    if (e.isComposing) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      endEdit();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    }
  };
  $('nodeEditor').addEventListener('pointerdown', (e) => e.stopPropagation());
  $('nodeEditor').addEventListener('dblclick', (e) => e.stopPropagation());
  // Keep the loaded tree stable while a draft is being edited.
  document.querySelector('header').addEventListener(
    'click',
    (e) => {
      if (editing) {
        e.preventDefault();
        e.stopImmediatePropagation();
        $('nodeText').focus();
      }
    },
    true,
  );
  document.querySelector('header').addEventListener(
    'input',
    (e) => {
      if (editing) {
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  document.querySelector('header').addEventListener(
    'change',
    (e) => {
      if (editing) {
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  window.addEventListener('beforeunload', (e) => {
    if (
      saving ||
      (!draftSaved && markdownDirty) ||
      (editing && $('nodeText').value.trim() !== editing.label)
    ) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ── 页面生命周期与启动 ──────────────────────────────────────────
  function updateViewport() {
    viewport.style.top = $('header').offsetHeight + 'px';
    const r = viewport.getBoundingClientRect();
    viewWidth = r.width;
    viewHeight = r.height;
    viewRect = { left: r.left, top: r.top };
    transform();
  }
  new ResizeObserver(updateViewport).observe($('header'));
  new ResizeObserver(() => {
    const r = viewport.getBoundingClientRect();
    viewWidth = r.width;
    viewHeight = r.height;
    viewRect = { left: r.left, top: r.top };
    transform();
  }).observe(viewport);
  window.addEventListener('resize', updateViewport);
  updateViewport();
  document.addEventListener('visibilitychange', () => {
    clearTimeout(pollTimer);
    pollTimer = null;
    if (document.hidden) {
      revision++;
      if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    } else {
      transform();
      refresh();
    }
  });
  window.addEventListener('pagehide', () => {
    revision++;
    clearTimeout(pollTimer);
    cancelAnimationFrame(frameId);
    frameId = 0;
  });
  window.addEventListener('pageshow', () => {
    updateViewport();
    schedulePoll();
  });
  async function initializeMap() {
    setSaving(true);
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (draft && typeof draft.text === 'string' && typeof draft.name === 'string') {
        // Retire only the untouched, auto-cached demo; preserve edits and file associations.
        const oldExample =
          !draft.fileId &&
          draft.dirty === false &&
          draft.name === '新建思维导图.md' &&
          draft.text === '# 中心主题\n## 想法\n### 双击编辑节点\n## 计划\n### 拖动整理分支\n';
        apply(oldExample ? INITIAL_MAP : draft.text, draft.name);
        markdownDirty = !!draft.dirty;
        activeFileId = typeof draft.fileId === 'string' ? draft.fileId : null;
        pendingReason = draft.fileReason === 'missing' ? 'missing' : '';
        associatedText = activeFileId
          ? typeof draft.baseText === 'string'
            ? draft.baseText
            : markdownDirty
              ? null
              : draft.text
          : null;
        $('status').textContent = '已恢复上次内容';
      } else {
        apply(INITIAL_MAP, sourceName);
      }
      await restoreAssociation();
      rememberDraft();
    } catch {
      apply(INITIAL_MAP, sourceName);
      draftSaved = false;
      updateStorageStatus();
      $('status').textContent = '未能恢复草稿，可新建或打开 Markdown';
    } finally {
      setSaving(false);
      schedulePoll();
    }
  }
  initializeMap();
  MindmapFileDrop.create(document, window, {
    blockedReason: fileDropBlockedReason,
    open: openDroppedMarkdown,
    error: (message) => showFileError(Error(message), '打开失败'),
  });
  window.mindmap = {
    parseMarkdown,
    getState: () => ({
      nodes: nodes.length,
      visible: visible.length,
      rendered: mountedNodes.size,
      sourceName,
      mode,
      scale,
    }),
    getPerformance: () => ({
      ...perf,
      metrics: { ...metrics.stats },
      cachedMetrics: metrics.size,
      cachedNodes: nodeCache.size,
      cachedEdges: edgeCache.size,
    }),
  };
})();
