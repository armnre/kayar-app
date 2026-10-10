import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { getSettings } from '../server/settings';

export default createEndpoint({
  description: 'Public site settings (support contacts, shop link, maintenance) and admin bootstrap status',
  inputSchema: z.object({}),
  outputSchema: z.object({
    siteName: z.string(), shopUrl: z.string(), supportPhone: z.string(), supportEmail: z.string(), supportWhatsapp: z.string(), instagram: z.string(), telegram: z.string(),
    jamendoEnabled: z.boolean(), maintenance: z.boolean(), maintenanceMessage: z.string(), loginHelpText: z.string(), adminReady: z.boolean(),
  }),
  execute: async () => {
    const { _id, ...s } = await getSettings();
    void _id;
    const hasAdmin = !!(await zite.members.findOne({ filters: { role: 'superadmin' } }));
    const adminReady = hasAdmin || !!(process.env.ZITE_BOOTSTRAP_ADMIN_USERNAME && process.env.ZITE_BOOTSTRAP_ADMIN_PASSWORD);
    return { ...s, adminReady };
  },
});
