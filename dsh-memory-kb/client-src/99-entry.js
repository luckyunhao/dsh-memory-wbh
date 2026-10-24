    // ── 插件入口 ────────────────────────────────────────────────────────────
    function apply(ctx) {
      let workspaceFilesApi = null;
      const wire = (ready) => {
        const getModelDirectories = () => {
          try { return typeof ctx.get === 'function' ? ctx.get('modelDirectories') : undefined; }
          catch { return undefined; }
        };
        const getWorkspaceServices = () => {
          try {
            return {
              uiWorkspace: typeof ctx.get === 'function' ? ctx.get('uiWorkspace') : undefined,
              workspaces: typeof ctx.get === 'function' ? ctx.get('workspaces') : undefined,
              sessions: typeof ctx.get === 'function' ? ctx.get('sessions') : undefined,
            };
          } catch {
            return {};
          }
        };
        const getWorkspaceFiles = () => workspaceFilesApi;
        const getRemote = () => {
          try { return typeof ctx.get === 'function' ? ctx.get('remote') : undefined; }
          catch { return undefined; }
        };
        const getFileUpload = () => {
          try { return typeof ctx.get === 'function' ? ctx.get('fileUpload') : undefined; }
          catch { return undefined; }
        };
        const register = () => {
          ready.slots.inject('sidebar.footer.action', () => ready.slots.register({
            name: 'sidebar.footer.action',
            id: 'dsh-memory-kb-open',
            order: 60,
            label: () => '记忆库',
          }, () => h(LaunchButton, null)));
          ready.slots.inject('shell.overlay', () => ready.slots.register({
            name: 'shell.overlay',
            id: 'dsh-memory-kb-panel',
            order: 820,
          }, () => h(React.Fragment, null,
            h(WindowControls, null),
            h(Workbench, {
              uiSession: ready.uiSession,
              getModelDirectories,
              getWorkspaceServices,
              getWorkspaceFiles,
              getRemote,
              getFileUpload,
            }))));
        };
        if (typeof ready.effect === 'function') ready.effect(register, 'dsh-memory-kb: mounts');
        else register();
      };
      if (typeof ctx.inject === 'function') {
        try {
          ctx.inject(['remote', 'remote.workspaceFiles'], (injected) => {
            try {
              workspaceFilesApi = injected.remote?.workspaceFiles
                ?? injected.get?.('remote')?.workspaceFiles
                ?? null;
            } catch {}
          });
        } catch {}
        ctx.inject(['slots', 'uiSession'], wire);
        return;
      }
      if (ctx.slots !== undefined) wire(ctx);
    }

    return { inject: ['slots', 'uiSession', 'remote', 'remote.fileReferences', 'remote.commands'], apply };
