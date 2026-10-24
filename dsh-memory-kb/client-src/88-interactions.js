    // ── 内嵌审批 / 提问（C1）────────────────────────────────────────────────
    // 不重新注册 waterfall，而是读取 uiSession.sessionStatus 里已经发布出来的
    // PendingApproval / PendingQuestion 对象，在工作台里直接渲染并回答。

    function interactionReason(pending) {
      const pick = (value) => (typeof value === 'string' && value.trim() ? value.trim() : '');
      return pick(pending?.reason) || pick(pending?.displayReason) || '';
    }

    function ApprovalCard({ pending, onExit }) {
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState('');
      const answer = async (outcome) => {
        if (busy || pending.answerable === false) return;
        setBusy(true);
        setError('');
        try {
          await pending.answer(outcome);
        } catch (err) {
          setError(err?.message || String(err));
          setBusy(false);
        }
      };
      const reason = interactionReason(pending);
      return h('div', { className: 'wb-approval' },
        h('div', { className: 'wb-approval-head' },
          h('span', { className: 'wb-eyebrow' }, '等待审批'),
          h('span', { className: 'wb-approval-tool' }, pending.toolName || '工具'),
        ),
        h('div', { className: 'wb-approval-reason' },
          reason || `工具 ${pending.toolName || ''} 请求越权执行，是否允许这一次？`),
        error ? h('div', { className: 'wb-approval-error' }, error) : null,
        h('div', { className: 'wb-approval-actions' },
          onExit ? h('button', { type: 'button', className: 'wb-btn', onClick: onExit }, '退出工作台处理') : null,
          h('button', { type: 'button', className: 'wb-btn', onClick: () => answer('rejected'), disabled: busy }, busy ? '…' : '拒绝'),
          h('button', { type: 'button', className: 'wb-btn wb-btn-primary', onClick: () => answer('allowed-once'), disabled: busy }, busy ? '…' : '允许一次'),
        ),
      );
    }

    function normalizeQuestions(pending) {
      const list = Array.isArray(pending?.questions) ? pending.questions : [];
      return list
        .filter((question) => question && typeof question.id === 'string' && typeof question.question === 'string')
        .map((question) => ({
          id: question.id,
          question: question.question,
          header: typeof question.header === 'string' ? question.header : '',
          detail: typeof question.detail === 'string' ? question.detail : '',
          multiSelect: question.multiSelect === true,
          options: Array.isArray(question.options)
            ? question.options.filter((option) => option && typeof option.label === 'string')
            : [],
        }));
    }

    function QuestionCard({ pending, onExit }) {
      const questions = React.useMemo(() => normalizeQuestions(pending), [pending]);
      const [drafts, setDrafts] = React.useState({});
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState('');
      React.useEffect(() => { setDrafts({}); setError(''); setBusy(false); }, [pending]);
      const stateOf = (id) => drafts[id] ?? { selected: [], custom: '' };
      const patch = (id, next) => setDrafts((prev) => ({ ...prev, [id]: { ...stateOf(id), ...next } }));
      const toggle = (question, label) => {
        const current = stateOf(question.id);
        const selected = question.multiSelect
          ? (current.selected.includes(label)
              ? current.selected.filter((item) => item !== label)
              : [...current.selected, label])
          : [label];
        patch(question.id, { selected, ...(question.multiSelect ? {} : { custom: '' }) });
      };
      const submit = async () => {
        if (busy) return;
        const missing = questions.find((question) => {
          const state = stateOf(question.id);
          return state.selected.length === 0 && !state.custom.trim();
        });
        if (missing) { setError('请先回答全部问题（可填“其他”）。'); return; }
        setBusy(true);
        setError('');
        try {
          await pending.answer({
            answers: questions.map((question) => {
              const state = stateOf(question.id);
              const custom = state.custom.trim();
              return {
                id: question.id,
                selected: custom && !question.multiSelect ? [] : state.selected,
                ...(custom ? { custom } : {}),
              };
            }),
          });
        } catch (err) {
          setError(err?.message || String(err));
          setBusy(false);
        }
      };
      if (questions.length === 0) return null;
      return h('div', { className: 'wb-question' },
        h('div', { className: 'wb-approval-head' },
          h('span', { className: 'wb-eyebrow' }, '等待回答'),
          h('span', { className: 'wb-approval-tool' }, `${questions.length} 个问题`),
        ),
        h('div', { className: 'wb-question-list' }, questions.map((question) => {
          const state = stateOf(question.id);
          return h('div', { key: question.id, className: 'wb-question-item' },
            question.header ? h('div', { className: 'wb-question-header' }, question.header) : null,
            h('div', { className: 'wb-question-title' }, question.question),
            question.detail ? h('pre', { className: 'wb-question-detail' }, question.detail) : null,
            question.options.length
              ? h('div', { className: 'wb-question-options' }, question.options.map((option) => h('button', {
                  key: option.label,
                  type: 'button',
                  className: `wb-question-option${state.selected.includes(option.label) ? ' is-selected' : ''}`,
                  onClick: () => toggle(question, option.label),
                },
                  h('span', null, option.label),
                  option.description ? h('small', null, option.description) : null,
                )))
              : null,
            h('input', {
              className: 'wb-input wb-question-custom',
              value: state.custom,
              placeholder: question.options.length ? '其他回答（可选）' : '输入回答',
              onChange: (event) => patch(question.id, { custom: event.target.value }),
            }),
          );
        })),
        error ? h('div', { className: 'wb-approval-error' }, error) : null,
        h('div', { className: 'wb-approval-actions' },
          onExit ? h('button', { type: 'button', className: 'wb-btn', onClick: onExit }, '退出工作台处理') : null,
          h('button', { type: 'button', className: 'wb-btn wb-btn-primary', onClick: submit, disabled: busy }, busy ? '提交中…' : '提交回答'),
        ),
      );
    }

    /** 读取当前主会话的 pendingInteraction 并渲染；工作台关闭时原生界面接管。 */
    function PendingInteractionHost({ uiSession, sessionId, onExit }) {
      const [pending, setPending] = React.useState(null);
      React.useEffect(() => {
        const status = uiSession?.sessionStatus;
        if (!status || typeof status.getSnapshot !== 'function' || !sessionId) {
          setPending(null);
          return undefined;
        }
        const read = () => {
          try {
            const row = status.getSnapshot()?.get?.(sessionId);
            const next = row?.pendingInteraction ?? null;
            setPending((prev) => (prev === next ? prev : next));
          } catch {
            setPending(null);
          }
        };
        read();
        const stop = typeof status.subscribe === 'function' ? status.subscribe(read) : undefined;
        return () => { if (typeof stop === 'function') stop(); };
      }, [uiSession, sessionId]);
      if (!pending) return null;
      if (Array.isArray(pending.questions) && pending.questions.length > 0) {
        return h(QuestionCard, { pending, onExit });
      }
      if (pending.toolName) return h(ApprovalCard, { pending, onExit });
      return null;
    }
