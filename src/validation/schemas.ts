import { z } from 'zod';

const agentNameSchema = z.enum(['claude', 'codex', 'qwen', 'gemini', 'all']);

const skillNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'Skill name must be lowercase letters, numbers, and hyphens');

export const skillsInstallOptsSchema = z.object({
  agent: agentNameSchema.optional(),
  scope: z.string().min(1).default('user'),
  name: skillNameSchema.default('gacli'),
  dryRun: z.boolean().optional(),
  force: z.boolean().optional(),
  noDetect: z.boolean().optional(),
});

export const skillsUninstallOptsSchema = z.object({
  agent: agentNameSchema.optional(),
  scope: z.string().min(1).default('user'),
  name: skillNameSchema.default('gacli'),
  dryRun: z.boolean().optional(),
  all: z.boolean().optional(),
});

export const skillsListOptsSchema = z.object({});

export const skillsPathOptsSchema = z.object({
  agent: z.enum(['claude', 'codex', 'qwen', 'gemini']),
  scope: z.string().min(1).default('user'),
});

export const skillsDoctorOptsSchema = z.object({});
