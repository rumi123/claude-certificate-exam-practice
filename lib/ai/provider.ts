import { disabledProvider } from './disabled';

export interface AiProvider {
  enabled: boolean;
  explain(input: {
    questionId: string;
    selected: string[];
    userQuestion?: string;
  }): Promise<string>;
}

// Phase 3 adds anthropic.ts here; until then the provider is always the disabled one.
export function getAiProvider(): AiProvider {
  return disabledProvider;
}
