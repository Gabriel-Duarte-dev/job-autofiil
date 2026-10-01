import OpenAI from 'openai';
import type { FillPlan } from '@/types/actions';
import { emptyProfile, type Profile } from '@/types/profile';

export function createOpenAI(apiKey: string) {
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

const PROFILE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'fullName',
    'firstName',
    'lastName',
    'email',
    'phone',
    'linkedin',
    'github',
    'website',
    'city',
    'state',
    'country',
    'zipCode',
    'address',
    'addressNumber',
    'neighborhood',
    'complement',
    'birthDate',
    'nationality',
    'cpf',
    'rg',
    'summary',
    'targetRole',
    'salaryExpectation',
    'availability',
    'workAuthorization',
    'experiences',
    'education',
    'languages',
    'skills',
    'certifications',
    'projects',
  ],
  properties: {
    fullName: { type: 'string' },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    linkedin: { type: 'string' },
    github: { type: 'string' },
    website: { type: 'string' },
    city: { type: 'string' },
    state: { type: 'string' },
    country: { type: 'string' },
    zipCode: { type: 'string' },
    address: { type: 'string' },
    addressNumber: { type: 'string' },
    neighborhood: { type: 'string' },
    complement: { type: 'string' },
    birthDate: { type: 'string', description: 'YYYY-MM-DD' },
    nationality: { type: 'string' },
    cpf: { type: 'string' },
    rg: { type: 'string' },
    summary: { type: 'string' },
    targetRole: { type: 'string' },
    salaryExpectation: { type: 'string' },
    availability: { type: 'string' },
    workAuthorization: { type: 'string' },
    experiences: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'company',
          'title',
          'location',
          'startDate',
          'endDate',
          'current',
          'description',
        ],
        properties: {
          company: { type: 'string' },
          title: { type: 'string' },
          location: { type: 'string' },
          startDate: { type: 'string', description: 'YYYY-MM' },
          endDate: { type: 'string', description: 'YYYY-MM or empty if current' },
          current: { type: 'boolean' },
          description: { type: 'string' },
        },
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'institution',
          'degree',
          'field',
          'startDate',
          'endDate',
          'current',
        ],
        properties: {
          institution: { type: 'string' },
          degree: { type: 'string' },
          field: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          current: { type: 'boolean' },
        },
      },
    },
    languages: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'level'],
        properties: {
          name: { type: 'string' },
          level: { type: 'string' },
        },
      },
    },
    skills: { type: 'array', items: { type: 'string' } },
    certifications: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'issuer', 'date'],
        properties: {
          name: { type: 'string' },
          issuer: { type: 'string' },
          date: { type: 'string' },
        },
      },
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'description', 'url'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          url: { type: 'string' },
        },
      },
    },
  },
} as const;

const FILL_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['actions', 'notes'],
  properties: {
    notes: { type: 'string' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'type',
          'fieldId',
          'value',
          'option',
          'checked',
          'reason',
          'label',
        ],
        properties: {
          type: {
            type: 'string',
            enum: ['fill', 'select', 'check', 'click', 'upload_resume', 'skip'],
          },
          fieldId: { type: 'string' },
          value: { type: 'string' },
          option: { type: 'string' },
          checked: { type: 'boolean' },
          reason: { type: 'string' },
          label: { type: 'string' },
        },
      },
    },
  },
} as const;

async function completeJson<T>(
  apiKey: string,
  model: string,
  schemaName: string,
  schema: Record<string, unknown>,
  system: string,
  user: string,
): Promise<T> {
  const client = createOpenAI(apiKey);
  const response = await client.chat.completions.create({
    model,
    temperature: 0.1,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: schemaName,
        strict: true,
        schema,
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('A OpenAI não retornou conteúdo.');
  return JSON.parse(content) as T;
}

export async function parseResumeWithOpenAI(
  text: string,
  apiKey: string,
  model: string,
): Promise<Profile> {
  const parsed = await completeJson<Profile>(
    apiKey,
    model,
    'candidate_profile',
    PROFILE_SCHEMA as unknown as Record<string, unknown>,
    `Extraia um perfil estruturado de candidato a partir do texto de um currículo.
Use strings vazias quando a informação não existir. Datas no formato YYYY-MM-DD (nascimento) ou YYYY-MM (experiência/formação).
Telefone no formato internacional se possível (+55...). LinkedIn e GitHub como URL completa.
Se o currículo estiver em português, mantenha os textos em português.
Não invente empresas, datas, CPF ou experiências que não estejam no texto.`,
    text.slice(0, 40000),
  );
  return { ...emptyProfile(), ...parsed };
}

export async function planFormFill(
  profile: Profile,
  schema: import('@/types/actions').FormSchema,
  apiKey: string,
  model: string,
): Promise<FillPlan> {
  return completeJson<FillPlan>(
    apiKey,
    model,
    'fill_plan',
    FILL_PLAN_SCHEMA as unknown as Record<string, unknown>,
    `Você preenche formulários de candidatura a vagas.
Regras:
- Use APENAS os fieldId / button ids recebidos. Nunca invente seletores.
- type fill: inputs de texto, textarea, contenteditable, date, tel, email, url, number. Coloque o texto em "value".
- type select: dropdown nativo ou combobox. Coloque em "option" o texto EXATO de uma das options listadas.
- type check: checkbox ou radio. "checked" true/false; para radio, "option" = texto da opção.
- type click: somente botões de adicionar campo (add_field) quando o perfil tem mais itens do que campos visíveis (ex.: 3 experiências e só 1 bloco).
- type upload_resume: input file de currículo/CV/resume.
- type skip: captcha, senha, assinatura, campos que não dá para inferir com segurança.
- Não preencha campos que já têm currentValue correto, a menos que esteja claramente incompleto.
- Para perguntas dissertativas (por que esta vaga, cover letter), escreva um parágrafo curto e profissional com base no perfil + pageText. Não invente fatos.
- Inferir sim/não razoavelmente (ex.: autorizado a trabalhar no país do anúncio se workAuthorization ou nationality combinar).
- Formate datas no formato que o campo pede (label/placeholder/hint). Se for type=date, use YYYY-MM-DD.
- Campos unused de cada ação: strings vazias e checked=false.
- label deve repetir o rótulo do campo para o usuário revisar.
- Se não houver match claro, skip com reason.`,
    JSON.stringify({
      profile,
      form: schema,
    }).slice(0, 100000),
  );
}
