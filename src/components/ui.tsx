import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

const baseBtn =
  'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50';

const variants = {
  primary: `${baseBtn} bg-indigo-600 text-white hover:bg-indigo-500`,
  secondary: `${baseBtn} bg-slate-100 text-slate-800 hover:bg-slate-200`,
  ghost: `${baseBtn} text-slate-600 hover:bg-slate-100`,
  danger: `${baseBtn} bg-red-50 text-red-700 hover:bg-red-100`,
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button className={`${variants[variant]} ${className}`} {...props} />;
}

const fieldClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-500 focus:ring-2';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string };

export function TextField({ label, className = '', id, ...props }: TextFieldProps) {
  const fieldId = id ?? props.name;
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <input id={fieldId} className={`${fieldClass} ${className}`} {...props} />
    </label>
  );
}

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string };

export function TextArea({ label, className = '', ...props }: AreaProps) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <textarea className={`${fieldClass} min-h-24 ${className}`} {...props} />
    </label>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <select className={fieldClass} {...props}>
        {children}
      </select>
    </label>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-900">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}
