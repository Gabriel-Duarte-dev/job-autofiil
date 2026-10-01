import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { executePlan } from '@/lib/executeFill';
import type { PlanFillResponse } from '@/lib/messages';
import { scanForm } from '@/lib/scanForm';
import { getResumeFile } from '@/lib/storage';
import type { FillAction, FillPlan } from '@/types/actions';

const MAX_CYCLES = 5;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function actionSummary(action: FillAction) {
  switch (action.type) {
    case 'fill':
      return action.value;
    case 'select':
      return action.option || action.value;
    case 'check':
      return action.checked ? action.option || 'sim' : 'não';
    case 'click':
      return action.reason || 'clicar';
    case 'upload_resume':
      return 'enviar PDF do currículo';
    case 'skip':
      return action.reason || 'pular';
    default:
      return '';
  }
}

const typeLabel: Record<FillAction['type'], string> = {
  fill: 'Preencher',
  select: 'Selecionar',
  check: 'Marcar',
  click: 'Clicar',
  upload_resume: 'Upload',
  skip: 'Pular',
};

export default function ContentApp() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'planning' | 'review' | 'filling' | 'done' | 'error'>(
    'idle',
  );
  const [message, setMessage] = useState('');
  const [plan, setPlan] = useState<FillPlan | null>(null);
  const [filled, setFilled] = useState(0);
  const [failed, setFailed] = useState(0);

  useEffect(() => {
    const onMessage = (msg: { type?: string }) => {
      if (msg?.type === 'START_FILL') {
        void startFill();
      }
    };
    browser.runtime.onMessage.addListener(onMessage);
    return () => browser.runtime.onMessage.removeListener(onMessage);
  }, []);

  async function requestPlan() {
    const schema = scanForm();
    if (schema.fields.length === 0 && schema.buttons.length === 0) {
      throw new Error('Nenhum campo de formulário visível nesta página.');
    }
    const response = (await browser.runtime.sendMessage({
      type: 'PLAN_FILL',
      schema,
    })) as PlanFillResponse;
    if (!response.ok) throw new Error(response.error);
    return response.plan;
  }

  async function startFill() {
    setOpen(true);
    setStatus('scanning');
    setMessage('Lendo o formulário...');
    setPlan(null);
    setFilled(0);
    setFailed(0);
    try {
      setStatus('planning');
      setMessage('O GPT está decidindo o que preencher...');
      const nextPlan = await requestPlan();
      setPlan(nextPlan);
      setStatus('review');
      setMessage(nextPlan.notes || 'Revise os valores antes de aplicar.');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Falha ao analisar o formulário.');
    }
  }

  async function apply(initial: FillPlan) {
    setStatus('filling');
    setMessage('Preenchendo campos...');
    const resume = await getResumeFile();
    let totalFilled = 0;
    let totalFailed = 0;
    let current = initial;

    for (let cycle = 0; cycle < MAX_CYCLES; cycle += 1) {
      const actionable = current.actions.filter((a) => a.type !== 'skip');
      if (actionable.length === 0) break;

      const result = await executePlan(actionable, resume);
      totalFilled += result.filled;
      totalFailed += result.failed;
      setFilled(totalFilled);
      setFailed(totalFailed);

      if (!result.clicked) break;
      setMessage(`Campos extras detectados (ciclo ${cycle + 2})...`);
      await sleep(500);
      try {
        current = await requestPlan();
        setPlan(current);
      } catch {
        break;
      }
    }

    setFilled(totalFilled);
    setFailed(totalFailed);
    setStatus('done');
    setMessage(
      totalFailed
        ? `Preenchidos ${totalFilled}. ${totalFailed} não aplicados — revise os destacados.`
        : `Pronto. ${totalFilled} ação(ões) aplicadas.`,
    );
  }

  const visibleActions = plan?.actions ?? [];

  return (
    <div className="pointer-events-none fixed inset-0 font-sans">
      <button
        type="button"
        onClick={() => void startFill()}
        className="pointer-events-auto absolute bottom-6 right-6 flex h-12 items-center gap-2 rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
      >
        Preencher
      </button>

      {open ? (
        <div className="pointer-events-auto absolute bottom-24 right-6 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Job Autofill</p>
              <p className="text-sm font-medium">{message}</p>
            </div>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
              onClick={() => setOpen(false)}
            >
              Fechar
            </button>
          </div>

          {status === 'review' && visibleActions.length > 0 ? (
            <ul className="max-h-72 overflow-auto px-4 py-2 text-sm">
              {visibleActions.map((action, index) => (
                <li
                  key={`${action.fieldId}-${index}`}
                  className="flex flex-col gap-0.5 border-b border-slate-50 py-2 last:border-0"
                >
                  <span className="text-xs font-semibold uppercase text-slate-400">
                    {typeLabel[action.type]} · {action.label || action.fieldId}
                  </span>
                  <span className={action.type === 'skip' ? 'text-slate-400' : 'text-slate-800'}>
                    {actionSummary(action)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {status === 'done' || status === 'filling' ? (
            <p className="px-4 py-2 text-sm text-slate-600">
              Aplicadas: {filled}
              {failed ? ` · falhas: ${failed}` : ''}
            </p>
          ) : null}

          <div className="flex gap-2 px-4 py-3">
            {status === 'review' && plan ? (
              <Button className="flex-1" onClick={() => void apply(plan)}>
                Confirmar e preencher
              </Button>
            ) : null}
            {status === 'error' ? (
              <Button className="flex-1" onClick={() => void startFill()}>
                Tentar de novo
              </Button>
            ) : null}
            {status === 'done' ? (
              <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
                Fechar
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
