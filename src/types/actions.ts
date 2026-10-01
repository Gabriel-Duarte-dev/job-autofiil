export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'date'
  | 'textarea'
  | 'select'
  | 'combobox'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'contenteditable'
  | 'button';

export interface ScannedField {
  id: string;
  type: FieldType;
  label: string;
  name: string;
  placeholder: string;
  required: boolean;
  section: string;
  options: string[];
  currentValue: string;
  hint: string;
}

export interface ScannedButton {
  id: string;
  label: string;
  kind: 'add_field' | 'other';
}

export interface FormSchema {
  url: string;
  title: string;
  pageText: string;
  fields: ScannedField[];
  buttons: ScannedButton[];
}

export type ActionType =
  | 'fill'
  | 'select'
  | 'check'
  | 'click'
  | 'upload_resume'
  | 'skip';

export interface FillAction {
  type: ActionType;
  fieldId: string;
  value: string;
  option: string;
  checked: boolean;
  reason: string;
  label: string;
}

export interface FillPlan {
  actions: FillAction[];
  notes: string;
}

export interface FillProgress {
  status: 'idle' | 'scanning' | 'planning' | 'review' | 'filling' | 'done' | 'error';
  message: string;
  plan: FillPlan | null;
  filled: number;
  failed: number;
}
