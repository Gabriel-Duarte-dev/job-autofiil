export interface WorkExperience {
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  current: boolean;
}

export interface Language {
  name: string;
  level: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
}

export interface Project {
  name: string;
  description: string;
  url: string;
}

export interface Profile {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  website: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  address: string;
  addressNumber: string;
  neighborhood: string;
  complement: string;
  birthDate: string;
  nationality: string;
  cpf: string;
  rg: string;
  summary: string;
  targetRole: string;
  salaryExpectation: string;
  availability: string;
  workAuthorization: string;
  experiences: WorkExperience[];
  education: Education[];
  languages: Language[];
  skills: string[];
  certifications: Certification[];
  projects: Project[];
}

export interface Settings {
  openaiApiKey: string;
  openaiModel: string;
}

export interface ResumeFile {
  name: string;
  mimeType: string;
  dataBase64: string;
}

export function emptyExperience(): WorkExperience {
  return {
    company: '',
    title: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    description: '',
  };
}

export function emptyEducation(): Education {
  return {
    institution: '',
    degree: '',
    field: '',
    startDate: '',
    endDate: '',
    current: false,
  };
}

export function emptyLanguage(): Language {
  return { name: '', level: '' };
}

export function emptyCertification(): Certification {
  return { name: '', issuer: '', date: '' };
}

export function emptyProject(): Project {
  return { name: '', description: '', url: '' };
}

export function emptyProfile(): Profile {
  return {
    fullName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    website: '',
    city: '',
    state: '',
    country: 'Brasil',
    zipCode: '',
    address: '',
    addressNumber: '',
    neighborhood: '',
    complement: '',
    birthDate: '',
    nationality: 'Brasileira',
    cpf: '',
    rg: '',
    summary: '',
    targetRole: '',
    salaryExpectation: '',
    availability: '',
    workAuthorization: '',
    experiences: [],
    education: [],
    languages: [],
    skills: [],
    certifications: [],
    projects: [],
  };
}

export const DEFAULT_SETTINGS: Settings = {
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
};

export const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini (rápido e barato)' },
  { value: 'gpt-4o', label: 'gpt-4o (formulários difíceis)' },
  { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
  { value: 'gpt-4.1', label: 'gpt-4.1' },
] as const;

export function profileIsReady(profile: Profile): boolean {
  return Boolean(profile.fullName.trim() && profile.email.trim());
}
