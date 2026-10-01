import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import type { StatusResponse } from '@/lib/messages';

export default function PopupApp() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void browser.runtime.sendMessage({ type: 'GET_STATUS' }).then((res: StatusResponse) => {
      setStatus(res);
    });
  }, []);

  async function fillPage() {
    setBusy(true);
    setError(null);
    try {
      const response = await browser.runtime.sendMessage({ type: 'START_FILL' });
      if (response && response.ok === false) {
        throw new Error(response.error);
      }
      window.close();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível falar com esta página. Recarregue a aba e tente de novo.',
      );
    } finally {
      setBusy(false);
    }
  }

  const ready = Boolean(status?.hasApiKey && status?.hasProfile);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Job Autofill</p>
        <h1 className="text-lg font-semibold text-slate-900">Preencher candidatura</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
        {status ? (
          <ul className="flex flex-col gap-1.5">
            <li>API key: {status.hasApiKey ? 'configurada' : 'ausente'}</li>
            <li>Perfil: {status.hasProfile ? status.fullName : 'incompleto'}</li>
            <li>Currículo PDF: {status.hasResume ? status.resumeName : 'não enviado'}</li>
            <li>Modelo: {status.model}</li>
          </ul>
        ) : (
          <p>Carregando...</p>
        )}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button disabled={!ready || busy} onClick={() => void fillPage()}>
        {busy ? 'Abrindo...' : 'Preencher esta página'}
      </Button>

      <Button variant="secondary" onClick={() => browser.runtime.openOptionsPage()}>
        Abrir opções / importar currículo
      </Button>
    </div>
  );
}
