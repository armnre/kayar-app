import { z } from 'zod';
import { createEndpoint } from '@/zite/backend';
import { requireSession, MATRIX, type Role } from '../server/rbac';
import { publicMember, toPublic, tokenField } from '../server/util';

export default createEndpoint({
  description: 'Returns the signed-in member for a session token',
  inputSchema: z.object({ token: tokenField }),
  outputSchema: z.object({ member: publicMember, permissions: z.array(z.string()) }),
  execute: async ({ input }) => {
    const { member } = await requireSession(input.token, { allowPasswordChange: true });
    return { member: toPublic(member), permissions: MATRIX[(member.role ?? 'member') as Role] ?? [] };
  },
});
