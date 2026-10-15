# کایار (KAYAR) — نسخه‌ی اجراشدنی در مرورگر

این مخزن، **پورت کامل سورس‌کد پروژه‌ی
[`armnre/kayar-app`](https://github.com/armnre/kayar-app)** است؛ همان برنامه‌ی فارسی «کایار — همراه ورزشی
هوشمند کاپوش» با سه بخش:

| بخش | مسیر | توضیح |
| --- | --- | --- |
| سایت عمومی | `#/` , `#/blog` , `#/blog/:slug` , `#/p/:slug` | لندینگ + وبلاگ + صفحات ثابت (CMS) |
| اپ اعضا | `#/app` , `#/app/morshed` , `#/app/bodyyar` , `#/app/profile` , `#/app/notifications` | مرشد (موزیک تمرین)، بدنیار، پروفایل |
| پنل مدیریت | `#/admin` (+ customers/staff/content/posts/media/morshed/announcements/settings/audit) | مدیریت مشتریان، محتوا، رسانه، موسیقی، اعلان‌ها، تنظیمات، لاگ‌ها |

## ورود نمونه

| نقش | نام کاربری | رمز |
| --- | --- | --- |
| مدیر ارشد (پنل `#/admin`) | `admin` | `kayar1403` |
| سردبیر محتوا (پنل) | `editor` | `kayar1403` |
| پشتیبانی (پنل) | `support` | `kayar1403` |
| مشتری (اپ `#/app`) | `kp-1040` … `kp-1055` | `kayar1403` |

## چه چیزی از مخزن اصلی منتقل شده است

سورس اصلی بدون بازنویسی منتقل شده و **همه‌ی منطق محصول دست‌نخورده** مانده است:

```
src/pages, src/components, src/lib, src/data   ← UI و منطق (همان فایل‌های مخزن اصلی)
src/api/*.ts (۲۶ endpoint)                     ← همان endpointها با همان zod schema
src/server/*.ts                                 ← همان منطق دامنه (RBAC، audit، password policy، Jamendo، AI)
src/ui/**                                        ← پکیج مشترک `packages/components` (shadcn/ui + markdown + markdown-editor)
src/index.css                                    ← تم «Neon Athletic Premium» (پورت‌شده از tailwind.config.ts به Tailwind v4)
```

تنها لایه‌ی «پلتفرم» (که در مخزن اصلی hosting زیت‌جی‌اس بود) با شیم‌های محلی جایگزین شده است:

| ماژول اصلی | معادل محلی | کار |
| --- | --- | --- |
| `zitejs/backend` | `src/zite/backend.ts` | `createEndpoint` (تایپ‌محور) و `ZiteError` با همان قرارداد خطا (`code` / `message` / `userFacingMessage`) |
| `zitejs/db` | `src/zite/db.ts` | دیتابیس درون‌مرورگر با همان API کالکشن‌ها (`findOne/findAll/create/update/delete/count`) + `sql()`؛ ذخیره‌سازی در `localStorage` |
| `zitejs/caller` + `.zite/api.ts` | `src/zite/caller.ts` + `src/zite/api.ts` | همان callerها؛ endpointها به‌جای HTTP، درون برنامه اجرا می‌شوند (با اعتبارسنجی zod ورودی و تأخیر شبیه‌سازی‌شده) |
| `zitejs/auth` , `zitejs/upload` | `src/zite/auth.ts` , `src/zite/upload.ts` | استند‌این حداقلی؛ آپلود فایل‌ها به‌صورت data-URL محلی و همان بررسی ماجیک‌بایت سمت «سرور» |
| `process.env.ZITE_*` | `src/zite/env.ts` | مقادیر پیش‌فرض (یوزر/رمز bootstrap، Pepper) و امکان override با `window.__KAYAR_ENV` |
| اجرای Postgres | `src/zite/sql.ts` | موتور کوچک SQL در مرورگر: `SELECT [DISTINCT [ON]]`, `JOIN/LEFT JOIN`, `unnest(string_to_array())`, `COUNT(*) FILTER (WHERE …)`, `GROUP BY`, `ORDER BY`, `LIMIT/OFFSET`, `LIKE/ILIKE`, `= ANY($n)`, `to_char(… AT TIME ZONE …)`, `now() - interval 'N days'` |

## داده‌ی نمونه

در اولین اجرا (اگر `localStorage` خالی باشد) داده‌ی نمونه‌ی واقع‌گرایانه ساخته می‌شود:
۳ کارمند، ۱۶ مشتری، ۵ مطلب وبلاگ منتشرشده، ۶ آهنگ کتابخانه‌ی مرشد + ۴ مجموعه، ۳ اعلان،
۴ رسانه، تنظیمات سایت و لاگ/تاریخچه‌ی گوش دادن ۳۰ روز اخیر (برای نمودار داشبورد). منبع: `src/zite/seed.ts`.

برای بازنشانی کامل داده‌های محلی:

```js
localStorage.removeItem('kayar.local-db.v1'); location.reload();
```

(دکمه‌ی «بازنشانی داده‌های محلی» در صفحه‌ی خطا هم همین کار را می‌کند.)

## راه‌اندازی

```bash
npm install

# ۱) بک‌اند واقعی (Express + SQLite + NaraRouter + درگاه پرداخت)
cp server/.env.example server/.env      # مقادیر را پر کن
npm run server:build                    # باندل بک‌اند → server/dist/server.mjs
npm run server                          # اجرای بک‌اند روی PORT (پیش‌فرض ۸۷۸۷)

# ۲) فرانت‌اند
npm run build                           # خروجی تک‌فایل؛ توسط همان بک‌اند سرو می‌شود
# حالا همه‌چیز روی http://localhost:8787 است:  /  ·  /#/app  ·  /#/admin
```

فرانت‌اند خودش تشخیص می‌دهد بک‌اند بالا هست یا نه:
اگر `GET /api/health` پاسخ بدهد همه‌ی درخواست‌ها روی HTTP می‌روند (`POST /api/<endpoint>`)، وگرنه
(مثلاً فایل تک‌فایلی بدون سرور) همان منطق در مرورگر روی `localStorage` اجرا می‌شود.
برای اجبار روی آدرس دیگر: `window.__KAYAR_ENV = { KAYAR_API_URL: 'https://app.kayar.ir/api' }`.

---

# بک‌اند (`server/`)

```
server/index.ts      اپ Express: استاتیک، آپلود، پل AI، هلث، خطاها
server/router.ts     ۲۶ endpoint محصول روی POST /api/<name> + rate limit
server/db.ts         SQLite (better-sqlite3): اسکیما، مخزن، مترجم SQL پستگرس→اسکلیت
server/zite-db.ts    پیاده‌ی `zitejs/db` سمت سرور (همان قرارداد + sql())
server/ai.ts         کلاینت NaraRouter: پنل مدل به‌ازای هر وظیفه، fallback، streaming، System One
server/payments.ts   درگاه‌ها (زرین‌پال/زیبال/آی‌دی‌پی/پی‌آی‌آر) + ساخت خودکار حساب پس از پرداخت
server/seed.ts       ساخت مدیر ارشد از Secrets + داده‌ی نمونه در اولین اجرا
server/build.mjs     باندل با esbuild (`@/zite/db` → اسکلیت، بقیه همان کد محصول)
```

* **پایگاه داده**: SQLite با WAL؛ جدول‌ها روی بوت ساخته و migrate می‌شوند
  (`created_at` یک ستون virtual از `createdAt` است، پس کوئری‌های snake_case و camelCase هر دو کار می‌کنند).
* **احراز هویت**: همان سیستم محصول — PBKDF2-SHA256 (۱۰۰ هزار تکرار + Pepper)، توکن‌های نشست hash‑شده،
  RBAC، قفل موقت پس از ۵ تلاش ناموفق، لاگ audit کامل.
* **آپلود واقعی**: `POST /api/upload` (multipart، حداکثر ۵MB، تشخیص نوع از روی بایت‌های اول فایل)،
  سرو فایل با `GET /api/file/:name`؛ سپس endpoint رسانه دوباره بایت‌ها را بررسی می‌کند.
* **امنیت**: rate limit روی IP، اعتبارسنجی zod روی هر端点، هدرهای اسپروف، callback امضاشده‌ی HMAC برای فروشگاه.

## هوش مصنوعی — NaraRouter (بهترین مدل برای هر جایگاه)

کلید روی سرور می‌ماند (`NARAROUTER_API_KEY`) و هرگز به مرورگر نمی‌رود. برای هر وظیفه یک «پنل مدل»
تعریف شده که از قوی‌ترین مدل شروع می‌کند و در صورت خطا (۴۰۲/۴۰۳/۴۲۹/۵۰۰/تایم‌اوت) به مدل بعدی
سقوط می‌کند؛ مدل‌های پرداختی تا وقتی اعتبار نباشد خودکار رد می‌شوند:

| جایگاه | کاربرد | پنل (به‌ترتیب اولویت) |
| --- | --- | --- |
| `plan` | ساخت برنامه‌ی تمرین/تغذیه (JSON) | gpt-6-astra → gpt-5.6-sol → claude-opus-5.5 → **nemotron-3-ultra-free** → agnes-3-flash |
| `chat` | گفتگوی مربی (بدن‌یار) | gpt-5.6-sol → claude-sonnet-5.5 → **nemotron-3-ultra-free** → agnes-2.5-flash |
| `vision` | تحلیل عکس (بدن/غذا) | gpt-5.6-luna → gemini-3.8-flash-high → **agnes-2.5-flash** |
| `fast` | کارهای سبک/برچسب | **nemotron-3.5-lightning-free** → laguna-s-2.1 |
| `code` | کد و پیکربندی | kimi-k2.7-code → gpt-6-astra → deepseek-v4-pro |
| `classify` | تحلیل ساخت‌یافته‌ی وضعیت (System One) | **jev** (choice/score/noul) |

وضعیت زنده در پنل: **تنظیمات → کارت «هوش مصنوعی (NaraRouter)»** (همچنین `GET /api/ai/status` و `POST /api/ai/chat`).
پنل `plan` و `chat` و `analyze` روی endpoint `bodyyarAi` سوار شده‌اند و UI «بدن‌یار» از آن‌ها استفاده می‌کند
(ساخت برنامه‌ی واقعی + چت زنده).

## درگاه پرداخت

- `POST /api/pay/checkout` → ساخت سفارش + هدایت به درگاه (زرین‌پال/زیبال/آی‌دی‌پی/پی‌آی‌آر).
- `GET /api/pay/callback/:provider` → تأیید تراکنش، **ساخت خودکار حساب کایار** (نام کاربری `kp-XXXX` + رمز موقت)
  و نمایش صفحه‌ی رسید با اطلاعات ورود.
- `POST /api/pay/webhook/kapoosh` → فروشگاه کاپوش با امضای HMAC-SHA256 (`x-kapoosh-signature`) سفارش را اعلام می‌کند
  و کایار اطلاعات حساب را برمی‌گرداند (برای ایمیل/پیامک از سمت فروشگاه).
- `GET /api/pay/orders` → گزارش سفارش‌ها برای پنل ادمین (هدر `x-kayar-token`).
- پلن‌ها در `server/payments.ts` (۳ ماهه ۴۹۰٬۰۰۰ / ۱۲ ماهه ۱٬۴۹۰٬۰۰۰ / مربی اختصاصی ۸۹۰٬۰۰۰ تومان).

> تا وقتی قرارداد درگاه فعال و `PAY_PROVIDER` + کلید مرچنت تنظیم نشده، فروشگاه پیام راهنمای فارسی می‌دهد
> (`GET /api/pay/health` وضعیت را نشان می‌دهد).

## متغیرهای اختیاری (قابلیت‌های زنده)

دو بخش نیازمند سرویس بیرونی هستند و بدون کلید، به‌شکل پیام راهنما کار می‌کنند:

- **موزیک زنده‌ی Jamendo** (حالت «مرشد»): `window.__KAYAR_ENV = { ZITE_JAMENDO_CLIENT_ID: '...' }`
- **پاسخ‌های هوش‌مصنوعی بدنیار**: `ZITE_AI_API_KEY` / `ZITE_AI_BASE_URL` / `ZITE_AI_MODEL`

فروشگاه کاپوش (`kapooshProducts`) نیز محصولات جایگزین نمایش می‌دهد اگر ارتباط برقرار نشود.

## نکات فنی پورت

- **روتینگ:** به‌جای `BrowserRouter` از `HashRouter` استفاده می‌شود تا خروجی تک‌فایل از هر مسیر یا حتی روی دیسک کار کند.
- **Tailwind:** نسخه‌ی ۴ با `@theme inline`؛ توکن‌های HSL مخزن اصلی (`--primary`, `--bg-1`, `--violet`, …) عیناً حفظ شده‌اند.
- **تایپ‌اسکریپت:** `strict` غیرفعال است (مثل تنظیمات ریشه‌ی مخزن اصلی)؛ بیلد فقط با `vite build` انجام می‌شود.
- **صداها:** آهنگ‌های نمونه به فایل‌های دموی SoundHelix اشاره می‌کنند (CC) تا پخش‌کننده واقعاً کار کند.
