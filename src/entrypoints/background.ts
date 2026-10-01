import { parseResumeWithOpenAI, planFormFill } from '@/lib/openai';
import type {
  ParseResumeResponse,
  PlanFillResponse,
  RuntimeMessage,
  StatusResponse,
} from '@/lib/messages';
import { getFillContext, getProfile, getSettings } from '@/lib/storage';
import { profileIsReady } from '@/types/profile';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
    void (async () => {
      try {
        if (message.type === 'GET_STATUS') {
          const { profile, settings, resume } = await getFillContext();
          const payload: StatusResponse = {
            hasApiKey: Boolean(settings.openaiApiKey.trim()),
            hasProfile: profileIsReady(profile),
            hasResume: Boolean(resume),
            fullName: profile.fullName,
            email: profile.email,
            resumeName: resume?.name ?? '',
            model: settings.openaiModel,
          };
          sendResponse(payload);
          return;
        }

        if (message.type === 'PARSE_RESUME_TEXT') {
          const settings = await getSettings();
          if (!settings.openaiApiKey.trim()) {
            const payload: ParseResumeResponse = {
              ok: false,
              error: 'Configure a API key da OpenAI nas opções.',
            };
            sendResponse(payload);
            return;
          }
          const profile = await parseResumeWithOpenAI(
            message.text,
            settings.openaiApiKey,
            settings.openaiModel,
          );
          sendResponse({ ok: true, profile } satisfies ParseResumeResponse);
          return;
        }

        if (message.type === 'PLAN_FILL') {
          const { profile, settings, resume } = await getFillContext();
          if (!settings.openaiApiKey.trim()) {
            sendResponse({
              ok: false,
              error: 'Configure a API key da OpenAI nas opções da extensão.',
            } satisfies PlanFillResponse);
            return;
          }
          if (!profileIsReady(profile)) {
            sendResponse({
              ok: false,
              error: 'Importe um currículo ou preencha nome e e-mail no perfil.',
            } satisfies PlanFillResponse);
            return;
          }
          const plan = await planFormFill(
            profile,
            message.schema,
            settings.openaiApiKey,
            settings.openaiModel,
          );
          sendResponse({
            ok: true,
            plan,
            hasResume: Boolean(resume),
          } satisfies PlanFillResponse);
          return;
        }

        if (message.type === 'START_FILL') {
          const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
          if (!tab?.id) {
            sendResponse({ ok: false, error: 'Nenhuma aba ativa.' });
            return;
          }
          await browser.tabs.sendMessage(tab.id, { type: 'START_FILL' });
          sendResponse({ ok: true });
        }
      } catch (error) {
        const text = error instanceof Error ? error.message : 'Erro inesperado.';
        sendResponse({ ok: false, error: text });
      }
    })();
    return true;
  });

  void getProfile();
});
