import type { AiProvider } from './provider';

export const disabledProvider: AiProvider = {
  enabled: false,
  async explain() {
    throw new Error('AI features are off');
  },
};
