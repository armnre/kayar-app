import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireStaff } from '../server/rbac';
import { getSettings, settingsSchema } from '../server/settings';
import { audit } from '../server/audit';
import { tokenField } from '../server/util';

const SECRETS = ['ZITE_BOOTSTRAP_ADMIN_USERNAME', 'ZITE_BOOTSTRAP_ADMIN_PASSWORD', 'ZITE_AUTH_PEPPER', 'ZITE_JAMENDO_CLIENT_ID'] as const;

export default createEndpoint({
  description: 'Reads or saves site settings (superadmin only)',
  inputSchema: z.object({ token: tokenField, save: settingsSchema.optional() }),
  outputSchema: z.object({ settings: settingsSchema, secrets: z.array(z.object({ key: z.string(), set: z.boolean() })) }),
  execute: async ({ input }) => {
    const { member } = await requireStaff(input.token, 'settings.manage');
    const { _id, ...current } = await getSettings();
    let settings = current;
    if (input.save) {
      settings = settingsSchema.parse(input.save);
      if (_id) await zite.siteSettings.update({ id: _id, record: { value: JSON.stringify(settings) } });
      else await zite.siteSettings.create({ record: { key: 'site', value: JSON.stringify(settings) } });
      const changed = Object.keys(settings).filter((k) => JSON.stringify(settings[k as keyof typeof settings]) !== JSON.stringify(current[k as keyof typeof current]));
      await audit(member.id, 'settings.update', 'settings', 'site', { changed });
    }
    return { settings, secrets: SECRETS.map((key) => ({ key, set: !!process.env[key] })) };
  },
});
