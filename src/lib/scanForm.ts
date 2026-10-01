import type {
  FieldType,
  FormSchema,
  ScannedButton,
  ScannedField,
} from '@/types/actions';

const ADD_RE =
  /(add\s+(another|new|more)|adicionar|nova?\s+(experi|forma|idioma|skill|habilid|certif|campo)|another\s+(job|experience|education|position)|mais um|\bincluir\b|\+\s*(experi|item|campo)?\s*$)/i;

const SKIP_TYPES = new Set(['hidden', 'password', 'submit', 'reset', 'image', 'button', 'color', 'range']);

const elementIds = new WeakMap<Element, string>();
const idToElement = new Map<string, HTMLElement>();
let seq = 0;

export function getElementByFieldId(id: string): HTMLElement | undefined {
  return idToElement.get(id);
}

export function resetFieldRegistry() {
  idToElement.clear();
  seq = 0;
}

function idFor(el: HTMLElement, prefix: string) {
  const existing = elementIds.get(el);
  if (existing) {
    idToElement.set(existing, el);
    return existing;
  }
  seq += 1;
  const id = `${prefix}-${seq}`;
  elementIds.set(el, id);
  idToElement.set(id, el);
  return id;
}

function isOurUi(el: Element) {
  return Boolean(
    el.closest('job-autofill-ui') ||
      el.getRootNode() instanceof ShadowRoot &&
        ((el.getRootNode() as ShadowRoot).host?.tagName.toLowerCase() === 'job-autofill-ui'),
  );
}

function isVisible(el: HTMLElement) {
  if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width >= 2 && rect.height >= 2;
}

function collectElements(root: Document | ShadowRoot | HTMLElement, acc: HTMLElement[]) {
  const list = root.querySelectorAll<HTMLElement>('*');
  for (const node of list) {
    if (isOurUi(node)) continue;
    acc.push(node);
    if (node.shadowRoot) collectElements(node.shadowRoot, acc);
    if (node.tagName === 'IFRAME') {
      try {
        const doc = (node as HTMLIFrameElement).contentDocument;
        if (doc?.documentElement) collectElements(doc, acc);
      } catch {
        // cross-origin
      }
    }
  }
}

function nearbyText(el: HTMLElement, max = 80) {
  const bits: string[] = [];
  let node: HTMLElement | null = el;
  for (let i = 0; i < 4 && node; i += 1) {
    const prev = node.previousElementSibling as HTMLElement | null;
    if (prev && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(prev.tagName)) {
      const t = prev.innerText?.trim();
      if (t) bits.push(t);
    }
    node = node.parentElement;
  }
  return bits.join(' ').replace(/\s+/g, ' ').slice(0, max);
}

function labelFor(el: HTMLElement): string {
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const texts = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.innerText?.trim())
      .filter(Boolean);
    if (texts.length) return texts.join(' ');
  }

  const aria = el.getAttribute('aria-label')?.trim();
  if (aria) return aria;

  if (el.id) {
    const byFor = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(el.id)}"]`);
    if (byFor?.innerText.trim()) return byFor.innerText.trim();
  }

  const wrap = el.closest('label');
  if (wrap) {
    const clone = wrap.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input,select,textarea,button').forEach((n) => n.remove());
    const t = clone.innerText.trim();
    if (t) return t;
  }

  const placeholder = el.getAttribute('placeholder')?.trim();
  if (placeholder) return placeholder;

  const title = el.getAttribute('title')?.trim();
  if (title) return title;

  const name = el.getAttribute('name')?.replace(/[_-]+/g, ' ').trim();
  if (name) return name;

  return nearbyText(el) || el.tagName.toLowerCase();
}

function sectionFor(el: HTMLElement): string {
  const fieldset = el.closest('fieldset');
  const legend = fieldset?.querySelector('legend');
  if (legend?.textContent?.trim()) return legend.textContent.trim();

  const group = el.closest('[role="group"], [role="radiogroup"], section, article');
  const groupLabel =
    group?.getAttribute('aria-label') ||
    group?.querySelector('h1,h2,h3,h4,h5,h6,legend,[data-section]')?.textContent?.trim();
  if (groupLabel) return groupLabel.slice(0, 80);

  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const heading = node.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > legend');
    if (heading?.textContent?.trim()) return heading.textContent.trim().slice(0, 80);
    const prev = node.previousElementSibling;
    if (prev && /^H[1-6]$/.test(prev.tagName) && prev.textContent?.trim()) {
      return prev.textContent.trim().slice(0, 80);
    }
    node = node.parentElement;
  }
  return '';
}

function optionsOf(el: HTMLElement): string[] {
  if (el instanceof HTMLSelectElement) {
    return [...el.options]
      .map((o) => o.text.trim() || o.value)
      .filter((t) => t && !/^select|selecione|choose|pick/i.test(t));
  }

  const listId = el.getAttribute('list');
  if (listId) {
    const datalist = document.getElementById(listId);
    if (datalist) {
      return [...datalist.querySelectorAll('option')]
        .map((o) => (o as HTMLOptionElement).label || o.textContent?.trim() || '')
        .filter(Boolean);
    }
  }

  return [];
}

function currentValue(el: HTMLElement): string {
  if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox' || el.type === 'radio') return el.checked ? 'true' : '';
    return el.value;
  }
  if (el instanceof HTMLSelectElement) {
    return el.options[el.selectedIndex]?.text?.trim() || el.value;
  }
  if (el instanceof HTMLTextAreaElement) return el.value;
  if (el.isContentEditable) return el.innerText.trim();
  return (el.textContent ?? '').trim().slice(0, 120);
}

function mapInputType(el: HTMLInputElement): FieldType | null {
  const type = (el.type || 'text').toLowerCase();
  if (SKIP_TYPES.has(type)) return null;
  if (type === 'file') return 'file';
  if (type === 'checkbox') return 'checkbox';
  if (type === 'radio') return 'radio';
  if (type === 'email') return 'email';
  if (type === 'tel') return 'tel';
  if (type === 'url') return 'url';
  if (type === 'number') return 'number';
  if (type === 'date' || type === 'month' || type === 'datetime-local' || type === 'week') return 'date';
  return 'text';
}

function isCombobox(el: HTMLElement) {
  const role = el.getAttribute('role');
  if (role === 'combobox' || role === 'listbox') return true;
  if (el.getAttribute('aria-haspopup') === 'listbox') return true;
  if (el.className?.toString().match(/select__control|ant-select|MuiSelect|css-.*-control/)) return true;
  return false;
}

function buttonText(el: HTMLElement) {
  return (
    el.getAttribute('aria-label') ||
    el.getAttribute('title') ||
    el.innerText ||
    el.getAttribute('value') ||
    ''
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function pageSnippet(max = 1800) {
  const main = (document.querySelector('main, [role="main"], article') ?? document.body) as HTMLElement;
  return (main.innerText || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function scanForm(): FormSchema {
  idToElement.clear();
  const all: HTMLElement[] = [];
  collectElements(document, all);

  const fields: ScannedField[] = [];
  const buttons: ScannedButton[] = [];
  const seenRadio = new Set<string>();

  for (const el of all) {
    if (!isVisible(el)) continue;

    if ('disabled' in el && (el as HTMLButtonElement).disabled) continue;
    if (el.closest('fieldset[disabled], job-autofill-ui')) continue;

    if (el instanceof HTMLInputElement) {
      const inputType = (el.type || 'text').toLowerCase();
      if (inputType === 'button' || inputType === 'submit') {
        const text = buttonText(el);
        if (text && ADD_RE.test(text)) {
          buttons.push({ id: idFor(el, 'btn'), label: text.slice(0, 80), kind: 'add_field' });
        }
        continue;
      }
      const mapped = mapInputType(el);
      if (!mapped) continue;

      if (mapped === 'radio') {
        const key = el.name || el.id;
        if (key && seenRadio.has(key)) continue;
        if (key) seenRadio.add(key);
        const group = key
          ? all.filter((n) => n instanceof HTMLInputElement && n.type === 'radio' && n.name === key)
          : [el];
        const options = group.map((n) => labelFor(n)).filter(Boolean);
        fields.push({
          id: idFor(el, 'field'),
          type: 'radio',
          label: sectionFor(el) || labelFor(el),
          name: el.name || '',
          placeholder: '',
          required: el.required || el.getAttribute('aria-required') === 'true',
          section: sectionFor(el),
          options,
          currentValue: group.find((n) => n instanceof HTMLInputElement && n.checked)
            ? labelFor(group.find((n) => n instanceof HTMLInputElement && n.checked) as HTMLElement)
            : '',
          hint: el.getAttribute('aria-describedby')
            ? document.getElementById(el.getAttribute('aria-describedby')!)?.innerText?.trim() ?? ''
            : '',
        });
        continue;
      }

      fields.push({
        id: idFor(el, 'field'),
        type: mapped,
        label: labelFor(el),
        name: el.name || '',
        placeholder: el.placeholder || '',
        required: el.required || el.getAttribute('aria-required') === 'true',
        section: sectionFor(el),
        options: optionsOf(el),
        currentValue: currentValue(el),
        hint: el.max ? `max ${el.max}` : '',
      });
      continue;
    }

    if (el instanceof HTMLTextAreaElement) {
      fields.push({
        id: idFor(el, 'field'),
        type: 'textarea',
        label: labelFor(el),
        name: el.name || '',
        placeholder: el.placeholder || '',
        required: el.required || el.getAttribute('aria-required') === 'true',
        section: sectionFor(el),
        options: [],
        currentValue: el.value,
        hint: '',
      });
      continue;
    }

    if (el instanceof HTMLSelectElement) {
      fields.push({
        id: idFor(el, 'field'),
        type: 'select',
        label: labelFor(el),
        name: el.name || '',
        placeholder: '',
        required: el.required || el.getAttribute('aria-required') === 'true',
        section: sectionFor(el),
        options: optionsOf(el),
        currentValue: currentValue(el),
        hint: el.multiple ? 'multiple' : '',
      });
      continue;
    }

    if (el.isContentEditable && el.getAttribute('role') !== 'button') {
      fields.push({
        id: idFor(el, 'field'),
        type: 'contenteditable',
        label: labelFor(el),
        name: '',
        placeholder: el.getAttribute('data-placeholder') || '',
        required: el.getAttribute('aria-required') === 'true',
        section: sectionFor(el),
        options: [],
        currentValue: el.innerText.trim().slice(0, 200),
        hint: '',
      });
      continue;
    }

    if (isCombobox(el) && (el instanceof HTMLInputElement || el.tabIndex >= 0 || el.getAttribute('role') === 'combobox')) {
      if (fields.some((f) => getElementByFieldId(f.id) === el)) continue;
      const listboxId = el.getAttribute('aria-controls');
      const listbox = listboxId ? document.getElementById(listboxId) : null;
      const options = listbox
        ? [...listbox.querySelectorAll('[role="option"]')].map((o) => o.textContent?.trim() || '').filter(Boolean)
        : [];
      fields.push({
        id: idFor(el, 'field'),
        type: 'combobox',
        label: labelFor(el),
        name: el.getAttribute('name') || '',
        placeholder: el.getAttribute('placeholder') || '',
        required: el.getAttribute('aria-required') === 'true',
        section: sectionFor(el),
        options,
        currentValue: currentValue(el),
        hint: 'custom combobox',
      });
      continue;
    }

    const tag = el.tagName;
    const role = el.getAttribute('role');
    if (tag === 'BUTTON' || role === 'button' || (tag === 'A' && ADD_RE.test(buttonText(el)))) {
      const text = buttonText(el);
      if (!text) continue;
      if (ADD_RE.test(text) || el.getAttribute('aria-label')?.match(ADD_RE)) {
        buttons.push({
          id: idFor(el, 'btn'),
          label: text.slice(0, 80),
          kind: 'add_field',
        });
      }
    }
  }

  return {
    url: location.href,
    title: document.title,
    pageText: pageSnippet(),
    fields,
    buttons,
  };
}
