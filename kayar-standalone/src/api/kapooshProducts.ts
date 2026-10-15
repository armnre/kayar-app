import { z } from 'zod';
import { createEndpoint } from '@/zite/backend';

const product = z.object({ id: z.number(), name: z.string(), price: z.number(), image: z.string(), link: z.string() });

export default createEndpoint({
  description: 'Fetches live products from the Kapoosh WooCommerce store',
  inputSchema: z.object({ limit: z.number().optional() }),
  outputSchema: z.object({ products: z.array(product), live: z.boolean() }),
  execute: async ({ input }) => {
    try {
      const res = await fetch(`https://kapoosh.ir/wp-json/wc/store/v1/products?per_page=${input.limit ?? 8}`);
      if (!res.ok) return { products: [], live: false };
      const data = (await res.json()) as Array<{ id: number; name: string; permalink: string; prices?: { price?: string; currency_minor_unit?: number }; images?: { src: string }[] }>;
      return {
        live: true,
        products: data.map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.prices?.price ?? 0) / 10 ** (p.prices?.currency_minor_unit ?? 0),
          image: p.images?.[0]?.src ?? '',
          link: p.permalink,
        })),
      };
    } catch {
      return { products: [], live: false };
    }
  },
});
