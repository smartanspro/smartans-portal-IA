import { z } from 'zod';

export const updateConfigSchema = z.object({
  slackWebhookUrl: z.string().url().or(z.literal('')).optional(),
  telegramBotToken: z.string().or(z.literal('')).optional(),
  telegramChatId: z.string().or(z.literal('')).optional(),
  emailTo: z.string().email().or(z.literal('')).optional(),
});

export const testMessageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});
