/**
 * KAYAR backend — payment gateway & subscription provisioning.
 *
 * Two ways an account can be created after a purchase:
 *   1. `POST /api/pay/checkout` → PSP (Zarinpal / Zibal / IDPay / Pay.ir) → callback → account.
 *   2. `POST /api/pay/webhook/kapoosh` → the shop (kapoosh.ir) tells us about a paid order
 *      (HMAC-signed) and we return the credentials so the shop can show/email them.
 *
 * Only the provider adapters are gateway-specific; everything else (orders, amount handling,
 * account generation, receipts) is shared. Set `PAY_PROVIDER` in `server/.env` to enable.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Express } from 'express';
import { config } from './config';
import { collection } from './db';
import { hashPassword, generateTempPassword, normalizePhone } from '@/server/auth';

/* ------------------------------------------------------------------ plans */

export type Plan = { id: string; title: string; days: number; amountToman: number; perks: string[] };

export const PLANS: Plan[] = [
  { id: 'kayar-3m', title: 'کایار — ۳ ماهه', days: 90, amountToman: 490_000, perks: ['مرشد (موزیک تمرین)', 'بدن‌یار', 'پشتیبانی پیام‌رسان'] },
  { id: 'kayar-12m', title: 'کایار — ۱۲ ماهه (۲ ماه هدیه)', days: 365, amountToman: 1_490_000, perks: ['همه‌ی امکانات', 'برنامه‌ی شخصی هوشمند', 'پشتیبانی اولویت‌دار'] },
  { id: 'coach-1m', title: 'مربی اختصاصی — ۱ ماه', days: 30, amountToman: 890_000, perks: ['بازبینی هفتگی برنامه', 'چت با مربی', 'تحلیل تصویری'] },
];

const planOf = (id: string) => PLANS.find((p) => p.id === id);

/** Rial amount for gateways (they bill in Rial; the shop prices in Toman). */
export const gatewayAmount = (amountToman: number) => (config.pay.currency === 'IRT' ? amountToman * 10 : amountToman);

/* ------------------------------------------------------------ PSP adapters */

export type ProviderId = 'zarinpal' | 'zibal' | 'idpay' | 'payir';
type RequestArgs = { amountToman: number; description: string; callbackUrl: string; orderId: string; mobile?: string };
type RequestResult = { url: string; authority: string };
type VerifyArgs = { authority: string; amountToman: number; orderId: string };
type VerifyResult = { ok: boolean; refId: string; raw: unknown };

const jsonFetch = async (url: string, body: unknown, headers: Record<string, string> = {}) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) as any }; }
  catch { return { status: res.status, data: { raw: text.slice(0, 400) } as any }; }
};

const adapters: Record<ProviderId, { request: (a: RequestArgs) => Promise<RequestResult>; verify: (a: VerifyArgs) => Promise<VerifyResult> }> = {
  /** https://docs.zarinpal.com — v4 REST */
  zarinpal: {
    async request(a) {
      const merchant_id = config.pay.mercurial.zarinpal;
      if (!merchant_id) throw new Error('ZARINPAL_MERCHANT_ID تنظیم نشده است.');
      const { data } = await jsonFetch('https://api.zarinpal.com/pg/v4/payment/request.json', {
        merchant_id, amount: gatewayAmount(a.amountToman), description: a.description, callback_url: a.callbackUrl,
        ...(a.mobile ? { metadata: { mobile: a.mobile } } : {}),
      });
      const authority = data?.data?.authority as string | undefined;
      if (!authority) throw new Error(`ZARINPAL_REQUEST_FAILED ${JSON.stringify(data?.errors ?? data).slice(0, 200)}`);
      return { url: `https://www.zarinpal.com/pg/StartPay/${authority}`, authority };
    },
    async verify(a) {
      const { data } = await jsonFetch('https://api.zarinpal.com/pg/v4/payment/verify.json', {
        merchant_id: config.pay.mercurial.zarinpal, amount: gatewayAmount(a.amountToman), authority: a.authority,
      });
      const code = data?.data?.code;
      return { ok: code === 100 || code === 101, refId: String(data?.data?.ref_id ?? ''), raw: data };
    },
  },

  /** https://docs.zibal.ir */
  zibal: {
    async request(a) {
      const merchant = config.pay.mercurial.zibal;
      if (!merchant) throw new Error('ZIBAL_MERCHANT تنظیم نشده است.');
      const { data } = await jsonFetch('https://gateway.zibal.ir/v1/request', {
        merchant, amount: gatewayAmount(a.amountToman), callbackUrl: a.callbackUrl, description: a.description, orderId: a.orderId,
        ...(a.mobile ? { mobile: a.mobile } : {}),
      });
      if (data?.result !== 100 || !data?.trackId) throw new Error(`ZIBAL_REQUEST_FAILED ${JSON.stringify(data).slice(0, 200)}`);
      return { url: `https://gateway.zibal.ir/start/${data.trackId}`, authority: String(data.trackId) };
    },
    async verify(a) {
      const { data } = await jsonFetch('https://gateway.zibal.ir/v1/verify', { merchant: config.pay.mercurial.zibal, trackId: Number(a.authority) });
      return { ok: data?.result === 100 || data?.result === 201, refId: String(data?.refNumber ?? ''), raw: data };
    },
  },

  /** https://idpay.ir/web-service/v1.1 */
  idpay: {
    async request(a) {
      const key = config.pay.mercurial.idpay;
      if (!key) throw new Error('IDPAY_API_KEY تنظیم نشده است.');
      const { data } = await jsonFetch('https://api.idpay.ir/v1.1/payment', {
        order_id: a.orderId, amount: gatewayAmount(a.amountToman), callback: a.callbackUrl, description: a.description,
        ...(a.mobile ? { phone: a.mobile } : {}),
      }, { 'X-API-KEY': key, 'X-SANDBOX': config.pay.sandbox ? '1' : '0' });
      if (!data?.id) throw new Error(`IDPAY_REQUEST_FAILED ${JSON.stringify(data).slice(0, 200)}`);
      return { url: data.link ?? `https://idpay.ir/p/ws/${data.id}`, authority: String(data.id) };
    },
    async verify(a) {
      const { data } = await jsonFetch('https://api.idpay.ir/v1.1/payment/verify', { id: a.authority, order_id: a.orderId }, {
        'X-API-KEY': config.pay.mercurial.idpay, 'X-SANDBOX': config.pay.sandbox ? '1' : '0',
      });
      return { ok: data?.status === 100 || data?.status === 101 || data?.status === 10, refId: String(data?.track_id ?? ''), raw: data };
    },
  },

  /** https://pay.ir/docs */
  payir: {
    async request(a) {
      const api = config.pay.mercurial.payir;
      if (!api) throw new Error('PAYIR_API_KEY تنظیم نشده است.');
      const { data } = await jsonFetch('https://pay.ir/pg/send', {
        api, amount: gatewayAmount(a.amountToman), redirect: a.callbackUrl, description: a.description,
        ...(a.mobile ? { mobile: a.mobile } : {}),
      });
      if (data?.status !== 1 || !data?.token) throw new Error(`PAYIR_REQUEST_FAILED ${JSON.stringify(data).slice(0, 200)}`);
      return { url: `https://pay.ir/pg/${data.token}`, authority: String(data.token) };
    },
    async verify(a) {
      const { data } = await jsonFetch('https://pay.ir/pg/verify', { api: config.pay.mercurial.payir, token: a.authority });
      return { ok: data?.status === 1, refId: String(data?.transId ?? ''), raw: data };
    },
  },
};

export const providerReady = () => config.pay.provider !== 'disabled' && config.pay.provider in adapters;

export function payStatus() {
  const provider = config.pay.provider;
  const missing: string[] = [];
  if (provider === 'zarinpal' && !config.pay.mercurial.zarinpal) missing.push('ZARINPAL_MERCHANT_ID');
  if (provider === 'zibal' && !config.pay.mercurial.zibal) missing.push('ZIBAL_MERCHANT');
  if (provider === 'idpay' && !config.pay.mercurial.idpay) missing.push('IDPAY_API_KEY');
  if (provider === 'payir' && !config.pay.mercurial.payir) missing.push('PAYIR_API_KEY');
  return {
    provider,
    enabled: providerReady() && missing.length === 0,
    currency: config.pay.currency,
    callbackBase: config.pay.callbackBase,
    missing,
    webhookReady: Boolean(config.pay.kapooshSecret),
    plans: PLANS,
  };
}

/* --------------------------------------------------- account provisioning */

const orders = () => collection('orders');
const members = () => collection('members');

async function uniqueUsername(seed: number) {
  const base = 1040 + (seed % 4000);
  for (let i = 0; i < 50; i++) {
    const candidate = `kp-${base + i}`;
    const exists = await members().findOne({ filters: { username: candidate } });
    if (!exists) return candidate;
  }
  return `kp-${Date.now().toString().slice(-6)}`;
}

/** Creates the KAYAR account that a paid order entitles, and returns its credentials once. */
export async function provisionAccount(order: { id: string; plan: string; fullName: string; phone: string; orderRef: string }) {
  const existing = await orders().findOne({ id: order.id });
  if (existing?.memberId) {
    return { username: String(existing.username ?? ''), tempPassword: String(existing.tempPassword ?? ''), expiresAt: String(existing.expiresAt ?? ''), reused: true };
  }
  const plan = planOf(order.plan);
  const count = await members().count({ filters: { role: 'member' } });
  const username = await uniqueUsername(count + Math.floor(Math.random() * 20));
  const tempPassword = generateTempPassword(10);
  const expiresAt = new Date(Date.now() + (plan?.days ?? 90) * 86400_000).toISOString();
  const created = await members().create({
    record: {
      username,
      phone: normalizePhone(order.phone) ?? order.phone,
      displayName: order.fullName || 'کاربر کایار',
      role: 'member',
      status: 'active',
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
      orderRef: order.orderRef,
      note: `اشتراک ${plan?.title ?? order.plan} — خرید آنلاین`,
      tags: ['اشتراک', plan?.id ?? order.plan],
      plan: plan?.id ?? order.plan,
      expiresAt,
      createdBy: 'payment',
    },
  });
  await orders().update({
    id: order.id,
    record: { status: 'paid', memberId: created.id, username, tempPassword, paidAt: new Date().toISOString(), expiresAt },
  });
  return { username, tempPassword, expiresAt, memberId: created.id, reused: false };
}

/* ------------------------------------------------------------------- routes */

const receiptHtml = (opts: { ok: boolean; title: string; body: string; username?: string; password?: string; refId?: string; expiresAt?: string }) => `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${opts.title} | کایار</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0A0C0E;color:#f7f7f7;font-family:Vazirmatn,system-ui,sans-serif;padding:24px}
  .card{max-width:520px;width:100%;background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.1);border-radius:28px;padding:28px}
  h1{font-size:22px;margin:0 0 8px}
  .ok{color:#D7FF1F}
  .creds{margin:18px 0;padding:16px;border-radius:20px;background:rgba(215,255,31,.08);border:1px solid rgba(215,255,31,.25)}
  .row{display:flex;justify-content:space-between;gap:12px;padding:6px 0;font-size:14px}
  .row b{font-family:ui-monospace,monospace;direction:ltr}
  p{color:#A7ABB6;line-height:1.9;font-size:14px}
  a.btn{display:inline-flex;align-items:center;gap:8px;margin-top:14px;background:#D7FF1F;color:#0B0D0E;font-weight:800;text-decoration:none;padding:12px 20px;border-radius:999px}
</style></head>
<body><div class="card">
  <h1>${opts.ok ? '<span class="ok">✓</span> ' : '⚠️ '}${opts.title}</h1>
  <p>${opts.body}</p>
  ${opts.username ? `<div class="creds">
    <div class="row"><span>نام کاربری</span><b>${opts.username}</b></div>
    <div class="row"><span>رمز موقت</span><b>${opts.password}</b></div>
    <div class="row"><span>اعتبار تا</span><b>${new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'long' }).format(new Date(opts.expiresAt ?? Date.now()))}</b></div>
    ${opts.refId ? `<div class="row"><span>شماره پیگیری</span><b>${opts.refId}</b></div>` : ''}
  </div>
  <p>در اولین ورود، رمز موقت را عوض کن. این صفحه را ذخیره کن؛ رمز موقت دیگر نمایش داده نمی‌شود.</p>
  <a class="btn" href="/#/app/login">ورود به اپ کایار ←</a>` : ''}
</div></body></html>`;

export function mountPayments(app: Express) {
  /** Gateway/plan status for the shop landing page and the admin panel. */
  app.get('/api/pay/health', (_req, res) => res.json({ ok: true, ...payStatus() }));

  /** Creates an order and returns the PSP redirect URL. */
  app.post('/api/pay/checkout', async (req, res) => {
    try {
      const status = payStatus();
      if (!status.enabled) {
        res.status(503).json({
          error: {
            type: 'gateway_disabled',
            message: 'payment provider not configured',
            user_facing_message:
              `درگاه پرداخت فعال نیست. کلیدهای ${status.missing.join(' / ') || 'درگاه'} باید در server/.env ثبت شوند ` +
              'تا پس از فعال‌سازی قرارداد درگاه (از پنل پی‌اس‌پی)، پرداخت آنلاین کار کند.',
          },
        });
        return;
      }
      const plan = planOf(String(req.body?.plan ?? ''));
      if (!plan) { res.status(400).json({ error: { type: 'validation_error', message: 'unknown plan', user_facing_message: 'پلن انتخابی معتبر نیست.' } }); return; }

      const order = await orders().create({
        record: {
          plan: plan.id, amount: plan.amountToman, currency: config.pay.currency, provider: config.pay.provider,
          status: 'pending', phone: String(req.body?.phone ?? ''), fullName: String(req.body?.fullName ?? ''),
          channel: 'website', payload: JSON.stringify({ ua: req.headers['user-agent'] ?? '' }),
        },
      });
      const callbackUrl = `${config.pay.callbackBase || config.appUrl}/api/pay/callback/${config.pay.provider}?order=${order.id}`;
      const result = await adapters[config.pay.provider as ProviderId].request({
        amountToman: plan.amountToman, description: `کایار — ${plan.title}`, callbackUrl, orderId: order.id, mobile: normalizePhone(String(req.body?.phone ?? '')) ?? undefined,
      });
      await orders().update({ id: order.id, record: { authority: result.authority } });
      res.json({ ok: true, url: result.url, orderId: order.id });
    } catch (e) {
      console.error('[kayar] checkout failed:', (e as Error).message);
      res.status(502).json({ error: { type: 'gateway_error', message: (e as Error).message, user_facing_message: 'ارتباط با درگاه پرداخت برقرار نشد؛ چند دقیقه بعد دوباره تلاش کن.' } });
    }
  });

  /** Return URL from the PSP. */
  app.get('/api/pay/callback/:provider', async (req, res) => {
    const send = (status: number, html: string) => res.status(status).type('html').send(html);
    try {
      const provider = String(req.params.provider) as ProviderId;
      if (!(provider in adapters)) { send(400, receiptHtml({ ok: false, title: 'درگاه ناشناس', body: 'درگاه پرداخت پشتیبانی نمی‌شود.' })); return; }
      const order = await orders().findOne({ id: String(req.query.order ?? '') });
      if (!order) { send(404, receiptHtml({ ok: false, title: 'سفارش پیدا نشد', body: 'این سفارش در سیستم ثبت نشده است.' })); return; }
      if (order.status === 'paid') {
        send(200, receiptHtml({ ok: true, title: 'این سفارش قبلاً تأیید شده است', body: 'حساب کاربری ساخته شده و پیامک/ایمیل شده است.', username: String(order.username), password: '(قبلاً نمایش داده شده)', refId: String(order.refId ?? ''), expiresAt: String(order.expiresAt ?? '') }));
        return;
      }
      // Gateways signal success differently in the query string.
      const q = req.query as Record<string, string>;
      const paid = provider === 'zarinpal' || provider === 'idpay' ? q.status === 'OK' || q.status === '10' || q.status === undefined : true;
      if (!paid) {
        await orders().update({ id: order.id, record: { status: 'failed' } });
        send(200, receiptHtml({ ok: false, title: 'پرداخت انجام نشد', body: 'اگر مبلغ کسر شده باشد تا ۷۲ ساعت به حساب تو برمی‌گردد.' }));
        return;
      }
      const authority = String(q.authority ?? q.trackId ?? q.id ?? q.token ?? order.authority ?? '');
      const verified = await adapters[provider].verify({ authority, amountToman: Number(order.amount ?? 0), orderId: order.id });
      if (!verified.ok) {
        await orders().update({ id: order.id, record: { status: 'verify_failed', refId: verified.refId, payload: JSON.stringify(verified.raw).slice(0, 4000) } });
        send(200, receiptHtml({ ok: false, title: 'تأیید پرداخت ناموفق بود', body: 'تراکنش تأیید نشد. اگر مبلغ کسر شد، با پشتیبانی تماس بگیر.' }));
        return;
      }
      await orders().update({ id: order.id, record: { refId: verified.refId } });
      const acc = await provisionAccount({ id: order.id, plan: String(order.plan), fullName: String(order.fullName ?? ''), phone: String(order.phone ?? ''), orderRef: String(order.refId || order.id) });
      send(200, receiptHtml({
        ok: true, title: 'پرداخت موفق — حساب کایار ساخته شد', body: 'اشتراک فعال شد. با اطلاعات زیر وارد شو؛ رمز موقت را در اولین ورود تغییر بده.',
        username: acc.username, password: acc.tempPassword, refId: verified.refId, expiresAt: acc.expiresAt,
      }));
    } catch (e) {
      console.error('[kayar] callback failed:', (e as Error).message);
      send(500, receiptHtml({ ok: false, title: 'خطای سرور', body: 'در تأیید پرداخت خطایی رخ داد؛ با پشتیبانی تماس بگیر. تراکنش‌ها در پنل ادمین قابل پیگیری است.' }));
    }
  });

  /**
   * Shop → KAYAR provisioning webhook (kapoosh.ir).
   * Body: { orderId, product, fullName, phone, plan? } signed with HMAC-SHA256 (header x-kapoosh-signature).
   */
  app.post('/api/pay/webhook/kapoosh', async (req, res) => {
    const secret = config.pay.kapooshSecret;
    if (!secret) {
      res.status(503).json({ error: { type: 'webhook_disabled', message: 'KAPOOSH_WEBHOOK_SECRET not set' } });
      return;
    }
    const raw = JSON.stringify(req.body ?? {});
    const given = String(req.headers['x-kapoosh-signature'] ?? '');
    const expected = createHmac('sha256', secret).update(raw).digest('hex');
    const ok = given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
    if (!ok) { res.status(401).json({ error: { type: 'unauthorized', message: 'bad signature' } }); return; }

    try {
      const body = req.body as { orderId?: string | number; product?: string; fullName?: string; phone?: string; plan?: string };
      const external = String(body.orderId ?? '');
      if (!external) { res.status(400).json({ error: { type: 'validation_error', message: 'orderId required' } }); return; }
      const existing = await orders().findOne({ filters: { authority: `kp:${external}` } });
      if (existing) { res.json({ ok: true, reused: true, username: existing.username }); return; }
      const plan = planOf(String(body.plan ?? '')) ?? planOf('kayar-12m')!;
      const order = await orders().create({
        record: {
          plan: plan.id, amount: plan.amountToman, currency: config.pay.currency, provider: 'kapoosh', status: 'pending',
          authority: `kp:${external}`, phone: String(body.phone ?? ''), fullName: String(body.fullName ?? ''), channel: 'shop',
          payload: JSON.stringify(body),
        },
      });
      const acc = await provisionAccount({ id: order.id, plan: plan.id, fullName: String(body.fullName ?? ''), phone: String(body.phone ?? ''), orderRef: external });
      res.json({ ok: true, username: acc.username, tempPassword: acc.tempPassword, plan: plan.id, expiresAt: acc.expiresAt });
    } catch (e) {
      console.error('[kayar] kapoosh webhook failed:', (e as Error).message);
      res.status(500).json({ error: { type: 'internal_error', message: (e as Error).message } });
    }
  });

  /** Orders list for the admin panel: `x-kayar-token: <admin session token>`. */
  app.get('/api/pay/orders', async (req, res) => {
    try {
      const token = String(req.headers['x-kayar-token'] ?? req.query.token ?? '');
      const { requireStaff } = await import('@/server/rbac');
      await requireStaff(token, 'customers.read');
      const { records } = await orders().findAll({ limit: 200, sort: { field: 'createdAt', direction: 'desc' } });
      res.json({ ok: true, orders: records.map((r) => ({
        id: r.id, plan: r.plan, amount: Number(r.amount ?? 0), provider: r.provider, status: r.status, refId: r.refId ?? '',
        username: r.username ?? '', phone: r.phone ?? '', fullName: r.fullName ?? '', channel: r.channel ?? '',
        createdAt: r.createdAt, paidAt: r.paidAt ?? null,
      })) });
    } catch (e) {
      res.status(403).json({ error: { type: 'forbidden', message: (e as Error).message, user_facing_message: 'دسترسی به گزارش پرداخت‌ها مجاز نیست.' } });
    }
  });
}
