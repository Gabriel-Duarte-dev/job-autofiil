import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button, Section, SelectField, TextArea, TextField } from '@/components/ui';
import { useStorage } from '@/hooks/useStorage';
import { downloadJson, fileToBase64 } from '@/lib/file';
import type { ParseResumeResponse } from '@/lib/messages';
import { extractPdfText } from '@/lib/parseResume';
import { getResumeFile, saveResumeFile } from '@/lib/storage';
import {
  DEFAULT_SETTINGS,
  emptyCertification,
  emptyEducation,
  emptyExperience,
  emptyLanguage,
  emptyProfile,
  emptyProject,
  MODEL_OPTIONS,
  type Profile,
  type Settings,
} from '@/types/profile';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-500 focus:ring-2';

export default function OptionsApp() {
  const [profile, setProfile, profileLoaded] = useStorage<Profile>('profile', emptyProfile());
  const [settings, setSettings, settingsLoaded] = useStorage<Settings>('settings', DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumeName, setResumeName] = useState<string>('');

  const loaded = profileLoaded && settingsLoaded;

  useEffect(() => {
    void getResumeFile().then((file) => {
      if (file?.name) setResumeName(file.name);
    });
  }, []);

  const skillText = useMemo(() => profile.skills.join(', '), [profile.skills]);

  async function handlePdf(file: File) {
    setBusy(true);
    setError(null);
    setMessage('Lendo o PDF e enviando para a OpenAI...');
    try {
      if (!settings.openaiApiKey.trim()) {
        throw new Error('Cole a API key da OpenAI antes de importar o currículo.');
      }
      const buffer = await file.arrayBuffer();
      const text = await extractPdfText(buffer);
      if (text.length < 40) {
        throw new Error(
          'Não foi possível ler texto neste PDF. Use um arquivo com texto selecionável.',
        );
      }
      const response = (await browser.runtime.sendMessage({
        type: 'PARSE_RESUME_TEXT',
        text,
      })) as ParseResumeResponse;
      if (!response.ok) throw new Error(response.error);

      const base64 = await fileToBase64(file);
      await saveResumeFile({
        name: file.name,
        mimeType: file.type || 'application/pdf',
        dataBase64: base64,
      });
      await setProfile({ ...emptyProfile(), ...response.profile });
      setResumeName(file.name);
      setMessage('Currículo importado. Revise os campos abaixo e salve se alterar algo.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao importar o PDF.');
      setMessage(null);
    } finally {
      setBusy(false);
    }
  }

  async function persistProfile() {
    await setProfile(profile);
    setMessage('Perfil salvo neste navegador.');
    setError(null);
  }

  async function persistSettings() {
    await setSettings(settings);
    setMessage('Configurações salvas.');
    setError(null);
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Profile;
        await setProfile({ ...emptyProfile(), ...parsed });
        setMessage('Perfil importado do JSON.');
      } catch {
        setError('JSON inválido.');
      }
    };
    reader.readAsText(file);
  }

  if (!loaded) {
    return <p className="p-8 text-sm text-slate-500">Carregando...</p>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              Job Autofill
            </p>
            <h1 className="text-xl font-semibold">Perfil e configurações</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => downloadJson('perfil-job-autofill.json', profile)}>
              Exportar JSON
            </Button>
            <Button onClick={() => void persistProfile()}>Salvar perfil</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-6">
        {message ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>
        ) : null}
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <Section title="OpenAI">
          <TextField
            label="API key"
            type="password"
            autoComplete="off"
            value={settings.openaiApiKey}
            onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
            placeholder="sk-..."
          />
          <SelectField
            label="Modelo"
            value={settings.openaiModel}
            onChange={(e) => setSettings({ ...settings, openaiModel: e.target.value })}
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectField>
          <div className="md:col-span-2">
            <Button variant="secondary" onClick={() => void persistSettings()}>
              Salvar chave e modelo
            </Button>
          </div>
        </Section>

        <Section title="Currículo (PDF)">
          <div className="md:col-span-2 flex flex-col gap-3">
            <p className="text-sm font-normal text-slate-600">
              O PDF é lido uma vez, vira o perfil abaixo e fica salvo para upload automático nos
              formulários. Nada é enviado além do texto do currículo e do schema do formulário para a
              OpenAI.
            </p>
            <input
              type="file"
              accept="application/pdf"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handlePdf(file);
              }}
            />
            {resumeName ? (
              <p className="text-sm text-slate-500">Arquivo salvo: {resumeName}</p>
            ) : null}
            <label className="text-sm font-medium text-slate-700">
              Importar perfil de um JSON
              <input
                className="mt-1 block"
                type="file"
                accept="application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importJson(file);
                }}
              />
            </label>
          </div>
        </Section>

        <Section title="Dados pessoais">
          <TextField
            label="Nome completo"
            value={profile.fullName}
            onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
          />
          <TextField
            label="Primeiro nome"
            value={profile.firstName}
            onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
          />
          <TextField
            label="Sobrenome"
            value={profile.lastName}
            onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
          />
          <TextField
            label="E-mail"
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          />
          <TextField
            label="Telefone"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
          <TextField
            label="Data de nascimento"
            placeholder="YYYY-MM-DD"
            value={profile.birthDate}
            onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
          />
          <TextField
            label="Nacionalidade"
            value={profile.nationality}
            onChange={(e) => setProfile({ ...profile, nationality: e.target.value })}
          />
          <TextField
            label="CPF"
            value={profile.cpf}
            onChange={(e) => setProfile({ ...profile, cpf: e.target.value })}
          />
          <TextField
            label="RG"
            value={profile.rg}
            onChange={(e) => setProfile({ ...profile, rg: e.target.value })}
          />
        </Section>

        <Section title="Endereço e links">
          <TextField
            label="Endereço"
            value={profile.address}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
          />
          <TextField
            label="Número"
            value={profile.addressNumber}
            onChange={(e) => setProfile({ ...profile, addressNumber: e.target.value })}
          />
          <TextField
            label="Bairro"
            value={profile.neighborhood}
            onChange={(e) => setProfile({ ...profile, neighborhood: e.target.value })}
          />
          <TextField
            label="Complemento"
            value={profile.complement}
            onChange={(e) => setProfile({ ...profile, complement: e.target.value })}
          />
          <TextField
            label="Cidade"
            value={profile.city}
            onChange={(e) => setProfile({ ...profile, city: e.target.value })}
          />
          <TextField
            label="UF"
            value={profile.state}
            onChange={(e) => setProfile({ ...profile, state: e.target.value })}
          />
          <TextField
            label="CEP"
            value={profile.zipCode}
            onChange={(e) => setProfile({ ...profile, zipCode: e.target.value })}
          />
          <TextField
            label="País"
            value={profile.country}
            onChange={(e) => setProfile({ ...profile, country: e.target.value })}
          />
          <TextField
            label="LinkedIn"
            value={profile.linkedin}
            onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
          />
          <TextField
            label="GitHub"
            value={profile.github}
            onChange={(e) => setProfile({ ...profile, github: e.target.value })}
          />
          <TextField
            label="Site"
            value={profile.website}
            onChange={(e) => setProfile({ ...profile, website: e.target.value })}
          />
        </Section>

        <Section title="Objetivo profissional">
          <TextField
            label="Cargo-alvo"
            value={profile.targetRole}
            onChange={(e) => setProfile({ ...profile, targetRole: e.target.value })}
          />
          <TextField
            label="Pretensão salarial"
            value={profile.salaryExpectation}
            onChange={(e) => setProfile({ ...profile, salaryExpectation: e.target.value })}
          />
          <TextField
            label="Disponibilidade"
            value={profile.availability}
            onChange={(e) => setProfile({ ...profile, availability: e.target.value })}
          />
          <TextField
            label="Autorização para trabalhar"
            value={profile.workAuthorization}
            onChange={(e) => setProfile({ ...profile, workAuthorization: e.target.value })}
          />
          <div className="md:col-span-2">
            <TextArea
              label="Resumo profissional"
              value={profile.summary}
              onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <TextArea
              label="Skills (separadas por vírgula)"
              value={skillText}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  skills: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </Section>

        <ListSection
          title="Experiências"
          onAdd={() => setProfile({ ...profile, experiences: [...profile.experiences, emptyExperience()] })}
        >
          {profile.experiences.map((item, index) => (
            <div key={index} className="md:col-span-2 grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 md:grid-cols-2">
              <TextField
                label="Empresa"
                value={item.company}
                onChange={(e) => {
                  const experiences = [...profile.experiences];
                  experiences[index] = { ...item, company: e.target.value };
                  setProfile({ ...profile, experiences });
                }}
              />
              <TextField
                label="Cargo"
                value={item.title}
                onChange={(e) => {
                  const experiences = [...profile.experiences];
                  experiences[index] = { ...item, title: e.target.value };
                  setProfile({ ...profile, experiences });
                }}
              />
              <TextField
                label="Local"
                value={item.location}
                onChange={(e) => {
                  const experiences = [...profile.experiences];
                  experiences[index] = { ...item, location: e.target.value };
                  setProfile({ ...profile, experiences });
                }}
              />
              <TextField
                label="Início (YYYY-MM)"
                value={item.startDate}
                onChange={(e) => {
                  const experiences = [...profile.experiences];
                  experiences[index] = { ...item, startDate: e.target.value };
                  setProfile({ ...profile, experiences });
                }}
              />
              <TextField
                label="Fim (YYYY-MM)"
                value={item.endDate}
                onChange={(e) => {
                  const experiences = [...profile.experiences];
                  experiences[index] = { ...item, endDate: e.target.value };
                  setProfile({ ...profile, experiences });
                }}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={item.current}
                  onChange={(e) => {
                    const experiences = [...profile.experiences];
                    experiences[index] = { ...item, current: e.target.checked };
                    setProfile({ ...profile, experiences });
                  }}
                />
                Trabalho atual
              </label>
              <div className="md:col-span-2">
                <TextArea
                  label="Descrição"
                  value={item.description}
                  onChange={(e) => {
                    const experiences = [...profile.experiences];
                    experiences[index] = { ...item, description: e.target.value };
                    setProfile({ ...profile, experiences });
                  }}
                />
              </div>
              <Button
                variant="danger"
                type="button"
                onClick={() =>
                  setProfile({
                    ...profile,
                    experiences: profile.experiences.filter((_, i) => i !== index),
                  })
                }
              >
                Remover
              </Button>
            </div>
          ))}
        </ListSection>

        <ListSection
          title="Formação"
          onAdd={() => setProfile({ ...profile, education: [...profile.education, emptyEducation()] })}
        >
          {profile.education.map((item, index) => (
            <div key={index} className="md:col-span-2 grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 md:grid-cols-2">
              <TextField
                label="Instituição"
                value={item.institution}
                onChange={(e) => {
                  const education = [...profile.education];
                  education[index] = { ...item, institution: e.target.value };
                  setProfile({ ...profile, education });
                }}
              />
              <TextField
                label="Curso / grau"
                value={item.degree}
                onChange={(e) => {
                  const education = [...profile.education];
                  education[index] = { ...item, degree: e.target.value };
                  setProfile({ ...profile, education });
                }}
              />
              <TextField
                label="Área"
                value={item.field}
                onChange={(e) => {
                  const education = [...profile.education];
                  education[index] = { ...item, field: e.target.value };
                  setProfile({ ...profile, education });
                }}
              />
              <TextField
                label="Início"
                value={item.startDate}
                onChange={(e) => {
                  const education = [...profile.education];
                  education[index] = { ...item, startDate: e.target.value };
                  setProfile({ ...profile, education });
                }}
              />
              <TextField
                label="Fim"
                value={item.endDate}
                onChange={(e) => {
                  const education = [...profile.education];
                  education[index] = { ...item, endDate: e.target.value };
                  setProfile({ ...profile, education });
                }}
              />
              <Button
                variant="danger"
                type="button"
                onClick={() =>
                  setProfile({
                    ...profile,
                    education: profile.education.filter((_, i) => i !== index),
                  })
                }
              >
                Remover
              </Button>
            </div>
          ))}
        </ListSection>

        <ListSection
          title="Idiomas"
          onAdd={() => setProfile({ ...profile, languages: [...profile.languages, emptyLanguage()] })}
        >
          {profile.languages.map((item, index) => (
            <div key={index} className="flex flex-col gap-2 md:col-span-1">
              <input
                className={inputClass}
                placeholder="Idioma"
                value={item.name}
                onChange={(e) => {
                  const languages = [...profile.languages];
                  languages[index] = { ...item, name: e.target.value };
                  setProfile({ ...profile, languages });
                }}
              />
              <input
                className={inputClass}
                placeholder="Nível"
                value={item.level}
                onChange={(e) => {
                  const languages = [...profile.languages];
                  languages[index] = { ...item, level: e.target.value };
                  setProfile({ ...profile, languages });
                }}
              />
            </div>
          ))}
        </ListSection>

        <ListSection
          title="Certificações"
          onAdd={() =>
            setProfile({ ...profile, certifications: [...profile.certifications, emptyCertification()] })
          }
        >
          {profile.certifications.map((item, index) => (
            <div key={index} className="md:col-span-2 grid gap-3 md:grid-cols-3">
              <input
                className={inputClass}
                placeholder="Nome"
                value={item.name}
                onChange={(e) => {
                  const certifications = [...profile.certifications];
                  certifications[index] = { ...item, name: e.target.value };
                  setProfile({ ...profile, certifications });
                }}
              />
              <input
                className={inputClass}
                placeholder="Emissor"
                value={item.issuer}
                onChange={(e) => {
                  const certifications = [...profile.certifications];
                  certifications[index] = { ...item, issuer: e.target.value };
                  setProfile({ ...profile, certifications });
                }}
              />
              <input
                className={inputClass}
                placeholder="Data"
                value={item.date}
                onChange={(e) => {
                  const certifications = [...profile.certifications];
                  certifications[index] = { ...item, date: e.target.value };
                  setProfile({ ...profile, certifications });
                }}
              />
            </div>
          ))}
        </ListSection>

        <ListSection
          title="Projetos"
          onAdd={() => setProfile({ ...profile, projects: [...profile.projects, emptyProject()] })}
        >
          {profile.projects.map((item, index) => (
            <div key={index} className="md:col-span-2 grid gap-3">
              <TextField
                label="Nome"
                value={item.name}
                onChange={(e) => {
                  const projects = [...profile.projects];
                  projects[index] = { ...item, name: e.target.value };
                  setProfile({ ...profile, projects });
                }}
              />
              <TextField
                label="URL"
                value={item.url}
                onChange={(e) => {
                  const projects = [...profile.projects];
                  projects[index] = { ...item, url: e.target.value };
                  setProfile({ ...profile, projects });
                }}
              />
              <div className="md:col-span-2">
                <TextArea
                  label="Descrição"
                  value={item.description}
                  onChange={(e) => {
                    const projects = [...profile.projects];
                    projects[index] = { ...item, description: e.target.value };
                    setProfile({ ...profile, projects });
                  }}
                />
              </div>
            </div>
          ))}
        </ListSection>
      </main>
    </div>
  );
}

function ListSection({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <Button variant="secondary" type="button" onClick={onAdd}>
          Adicionar
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}
