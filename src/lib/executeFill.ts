import type { FillAction } from '@/types/actions';
import { getElementByFieldId } from '@/lib/scanForm';
import { base64ToUint8Array } from '@/lib/file';
import type { ResumeFile } from '@/types/profile';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function nativeSet(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  desc?.set?.call(el, value);
  el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: value }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function highlight(el: HTMLElement) {
  const prev = el.style.outline;
  el.style.outline = '2px solid #4f46e5';
  el.style.outlineOffset = '2px';
  window.setTimeout(() => {
    el.style.outline = prev;
    el.style.outlineOffset = '';
  }, 1600);
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchOptionText(options: string[], wanted: string) {
  const n = normalize(wanted);
  const exact = options.find((o) => normalize(o) === n);
  if (exact) return exact;
  return options.find((o) => normalize(o).includes(n) || n.includes(normalize(o)));
}

async function fillSelect(el: HTMLSelectElement, wanted: string) {
  const labels = [...el.options].map((o) => o.text.trim() || o.value);
  const match = matchOptionText(labels, wanted);
  const option = match
    ? [...el.options].find((o) => (o.text.trim() || o.value) === match)
    : [...el.options].find((o) => normalize(o.value) === normalize(wanted));
  if (!option) throw new Error('opção não encontrada');
  el.value = option.value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function fillCombobox(el: HTMLElement, wanted: string) {
  el.click();
  el.focus();
  await sleep(180);

  if (el instanceof HTMLInputElement) {
    nativeSet(el, wanted);
    await sleep(220);
  } else {
    const input = el.querySelector('input') || document.querySelector('input[role="combobox"]');
    if (input instanceof HTMLInputElement) {
      nativeSet(input, wanted);
      await sleep(220);
    }
  }

  const options = [
    ...document.querySelectorAll<HTMLElement>('[role="option"], [role="listbox"] li, .ant-select-item-option'),
  ].filter((n) => n.offsetParent !== null);

  const texts = options.map((o) => o.innerText.trim());
  const match = matchOptionText(texts, wanted);
  const node = match ? options.find((o) => o.innerText.trim() === match) : undefined;
  if (node) {
    node.click();
    await sleep(80);
    return;
  }

  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
}

async function fillRadio(el: HTMLElement, option: string) {
  const input = el instanceof HTMLInputElement ? el : el.querySelector('input[type="radio"]');
  const name = input instanceof HTMLInputElement ? input.name : '';
  const group = name
    ? [...document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(name)}"]`)]
    : input instanceof HTMLInputElement
      ? [input]
      : [];

  const wanted = normalize(option);
  const target = group.find((n) => {
    const label = n.closest('label')?.innerText || n.getAttribute('aria-label') || n.value;
    return normalize(label).includes(wanted) || wanted.includes(normalize(label)) || normalize(n.value) === wanted;
  });
  if (!target) throw new Error('radio não encontrado');
  target.click();
  target.checked = true;
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.dispatchEvent(new Event('change', { bubbles: true }));
}

async function uploadResume(el: HTMLElement, resume: ResumeFile) {
  if (!(el instanceof HTMLInputElement) || el.type !== 'file') {
    throw new Error('não é um campo de arquivo');
  }
  const bytes = base64ToUint8Array(resume.dataBase64);
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: resume.mimeType || 'application/pdf',
  });
  const file = new File([blob], resume.name || 'curriculo.pdf', {
    type: resume.mimeType || 'application/pdf',
  });
  const dt = new DataTransfer();
  dt.items.add(file);
  el.files = dt.files;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

export async function executeAction(
  action: FillAction,
  resume: ResumeFile | null,
): Promise<'ok' | 'skip' | 'fail'> {
  if (action.type === 'skip') return 'skip';

  const el = getElementByFieldId(action.fieldId);
  if (!el) return 'fail';

  try {
    switch (action.type) {
      case 'fill': {
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          nativeSet(el, action.value);
        } else if (el.isContentEditable) {
          el.focus();
          el.innerText = action.value;
          el.dispatchEvent(new InputEvent('input', { bubbles: true }));
        } else {
          const inner = el.querySelector('input,textarea');
          if (inner instanceof HTMLInputElement || inner instanceof HTMLTextAreaElement) {
            nativeSet(inner, action.value);
          } else {
            throw new Error('elemento não preenchível');
          }
        }
        highlight(el);
        return 'ok';
      }
      case 'select': {
        if (el instanceof HTMLSelectElement) {
          await fillSelect(el, action.option || action.value);
        } else {
          await fillCombobox(el, action.option || action.value);
        }
        highlight(el);
        return 'ok';
      }
      case 'check': {
        if (el instanceof HTMLInputElement && el.type === 'radio') {
          await fillRadio(el, action.option || action.value);
        } else if (el instanceof HTMLInputElement && el.type === 'checkbox') {
          if (el.checked !== action.checked) el.click();
        } else {
          await fillRadio(el, action.option || action.value);
        }
        highlight(el);
        return 'ok';
      }
      case 'click': {
        el.click();
        highlight(el);
        await sleep(450);
        return 'ok';
      }
      case 'upload_resume': {
        if (!resume) throw new Error('nenhum PDF salvo');
        await uploadResume(el, resume);
        highlight(el);
        return 'ok';
      }
      default:
        return 'skip';
    }
  } catch {
    return 'fail';
  }
}

export async function executePlan(
  actions: FillAction[],
  resume: ResumeFile | null,
  onEach?: (action: FillAction, result: 'ok' | 'skip' | 'fail') => void,
) {
  let filled = 0;
  let failed = 0;
  let clicked = false;

  for (const action of actions) {
    const result = await executeAction(action, resume);
    onEach?.(action, result);
    if (result === 'ok') filled += 1;
    if (result === 'fail') failed += 1;
    if (action.type === 'click' && result === 'ok') clicked = true;
    await sleep(60);
  }

  return { filled, failed, clicked };
}
