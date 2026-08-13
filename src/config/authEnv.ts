import { z } from 'zod';

const authEnvSchema = z.object({
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default('1d'),
});

const _authEnv = authEnvSchema.safeParse(process.env);
if (!_authEnv.success) {
  console.error('❌ Missing auth env configurations:\n', _authEnv.error.format());
  process.exit(1);
}

export const authEnv = _authEnv.data;
