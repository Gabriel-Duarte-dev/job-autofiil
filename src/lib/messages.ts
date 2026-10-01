import type { FormSchema } from '@/types/actions';
import type { Profile } from '@/types/profile';

export type RuntimeMessage =
  | { type: 'PLAN_FILL'; schema: FormSchema }
  | { type: 'PARSE_RESUME_TEXT'; text: string }
  | { type: 'GET_STATUS' }
  | { type: 'START_FILL' };

export type StatusResponse = {
  hasApiKey: boolean;
  hasProfile: boolean;
  hasResume: boolean;
  fullName: string;
  email: string;
  resumeName: string;
  model: string;
};

export type ParseResumeResponse =
  | { ok: true; profile: Profile }
  | { ok: false; error: string };

export type PlanFillResponse =
  | { ok: true; plan: import('@/types/actions').FillPlan; hasResume: boolean }
  | { ok: false; error: string };
