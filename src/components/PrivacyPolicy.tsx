import React from 'react';
import { ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

const policySections = [
  {
    title: 'Information you provide',
    paragraphs: [
      'When you use speech generation, the text, selected voice, and style instructions you submit are sent to Google Gemini to create audio. When you use AI music generation, your music description is sent to Google Gemini to create a music clip. Questions submitted to the AI Assistant are also sent to Google Gemini so it can prepare a response.',
      'Audio files you choose with the Background Music upload control are processed in your browser to preview and mix with generated speech. The app does not upload those selected files to its server.',
      'When you use Audio to Video, the audio you select is sent through the VoiceMack server to Google Gemini for analysis and video generation. The generated video is returned to your browser, where the selected original audio is added before preview or download.',
      'Voice replication sends a 10-30 second voice sample and a consent recording from the same adult speaker to Google Gemini. Replicated voice keys are stored only in this browser and expire after seven days; source recordings are not saved by VoiceMack.',
    ],
  },
  {
    title: 'How information is used',
    paragraphs: [
      'The app uses submitted text and prompts only to provide the feature you request. Generated speech and music are returned to your browser for playback and download. Temporary audio caching may be used in memory while the server process is running to avoid repeating identical speech requests.',
      'VoiceMack does not ask you to create an account. Avoid submitting confidential, sensitive, or personal information in text, prompts, or uploaded audio.',
    ],
  },
  {
    title: 'Service providers',
    paragraphs: [
      'Voice generation, voice replication, AI music generation, assistant responses, and audio-to-video generation rely on Google Gemini APIs. The website is hosted by Netlify. Those providers may process technical request data under their own terms and privacy policies. Review Google’s and Netlify’s current policies for details about their handling and retention practices.',
    ],
  },
  {
    title: 'API keys and security',
    paragraphs: [
      'The Gemini API key is configured on the server as an environment variable and is not intended to be exposed in the browser. Do not place API keys in public source files or share them. No internet service can guarantee absolute security, so only use the app with information you are comfortable sending to its providers.',
    ],
  },
  {
    title: 'Storage, cookies, and analytics',
    paragraphs: [
      'VoiceMack does not require an account. Generated speech and video history and stateless replicated voice keys are stored in this browser’s IndexedDB until you clear them or remove browser site data. Replicated voice keys expire after seven days. The app uses in-memory caching for speech during a server session. Uploaded source audio is not saved to a server-side library by VoiceMack.',
    ],
  },
  {
    title: 'Your choices',
    paragraphs: [
      'You can stop using a feature before submitting its text, prompt, or audio. You can remove a replicated voice from Voice Studio, clear generated speech from the History page, or clear locally stored data through your browser settings. Uploaded background audio and generated video files are kept in the current browser session; closing the page removes them from the app interface.',
    ],
  },
  {
    title: 'Children and policy updates',
    paragraphs: [
      'VoiceMack is not designed to collect information from children. This policy may be updated as the app changes. The latest version will be available on this page with its revision date.',
    ],
  },
];

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => (
  <article className="w-full max-w-2xl mx-auto pb-28 text-[#F1F0F5]">
    <button
      type="button"
      onClick={onBack}
      className="mb-8 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-emerald-200 transition-colors hover:text-white"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to VoiceMack
    </button>

    <header className="border-b border-emerald-300/20 pb-7">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase text-emerald-300">
        <ShieldCheck className="h-4 w-4" />
        VoiceMack · Legal
      </div>
      <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">Privacy Policy</h1>
      <p className="mt-3 text-sm text-purple-200/70">Last updated: October 1, 2026</p>
      <p className="mt-5 max-w-xl text-sm leading-6 text-purple-100/85">
        This page explains what happens to information when you use VoiceMack’s speech, music, video, and AI assistant features.
      </p>
    </header>

    <div className="divide-y divide-purple-900/40">
      {policySections.map((section, index) => (
        <section key={section.title} className="grid gap-2 py-6 sm:grid-cols-[3.5rem_1fr] sm:gap-4">
          <span className="pt-0.5 font-mono text-xs text-emerald-300/70">{String(index + 1).padStart(2, '0')}</span>
          <div>
            <h2 className="text-base font-semibold text-white">{section.title}</h2>
            <div className="mt-2 space-y-3 text-sm leading-6 text-purple-100/75">
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </div>
        </section>
      ))}
    </div>

    <footer className="border-t border-emerald-300/20 pt-5 text-xs leading-5 text-purple-200/60">
      Provider policies:{' '}
      <a className="inline-flex items-center gap-1 text-emerald-200 hover:text-white" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
        Google Privacy Policy <ExternalLink className="h-3 w-3" />
      </a>
      {' · '}
      <a className="inline-flex items-center gap-1 text-emerald-200 hover:text-white" href="https://www.netlify.com/privacy/" target="_blank" rel="noreferrer">
        Netlify Privacy Policy <ExternalLink className="h-3 w-3" />
      </a>
    </footer>
  </article>
);