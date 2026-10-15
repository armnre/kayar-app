# انتشار روی گیت‌هاب و ساخت Pull Request

> در این محیط به حساب گیت‌هاب دسترسی (توکن/SSH) وجود ندارد، پس مخزن به‌صورت **آماده‌ی push**
> ساخته شده است: یک ریپوی گیت با شاخه‌ی `feat/real-backend-nararouter-payments` و کامیت کامل.
> با یکی از دو روش زیر در چند ثانیه روی گیت‌هاب می‌رود.

## روش ۱ — اسکریپت خودکار (توصیه‌شده، با توکن)

```bash
# یک توکن کلاسیک با دسترسی repo بساز: https://github.com/settings/tokens
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxx
export GITHUB_REPO=armnre/kayar-app          # یا نام کاربری/مخزنِ خودت
./scripts/push-to-github.sh
```

اسکریپت این کارها را انجام می‌دهد: شاخه‌سازی، push، و **ساخت خودکار Pull Request** با متن آماده
(اگر توکن دسترسی PR نداشته باشد، لینک ساخت PR را چاپ می‌کند).

## روش ۲ — دستی با SSH

```bash
git remote add origin git@github.com:armnre/kayar-app.git
git push -u origin feat/real-backend-nararouter-payments
# سپس دکمه‌ی «Compare & pull request» را در گیت‌هاب بزن (متن آماده در ادامه)
```

## روش ۳ — مخزن تازه

```bash
git remote add origin git@github.com:<user>/<new-repo>.git
git push -u origin master          # شاخه‌ی اصلی
git push origin feat/real-backend-nararouter-payments
```

---

## عنوان پیشنهادی PR

```
feat: بک‌اند واقعی (Express+SQLite) + هوش مصنوعی NaraRouter + درگاه پرداخت
```

## متن پیشنهادی PR (کپی کن)

```markdown
این PR سورس پروژه را از وضعیت «فرانت‌اند روی پلتفرم هاست‌شده» به یک **پلتفرم خودکفا** می‌برد:

### افزوده‌ها
- **بک‌اند واقعی** (`server/`): Express + SQLite (WAL/migrations) با همان ۲۷ endpoint محصول روی
  `POST /api/<name>`، اعتبارسنجی zod، پوشش خطای استاندارد، rate-limit، CORS و هدرهای امنیتی.
  یک مترجم SQL پستگرس→SQLite نوشته شده تا کوئری‌های خام اپ (to_char/AT TIME ZONE،
  `unnest(string_to_array())`, `COUNT(*) FILTER`, `DISTINCT ON`, `= ANY($n)`, `::text`,
  `now() - interval`) بدون تغییر در کد محصول اجرا شوند.
- **احراز هویت و امنیت**: PBKDF2-SHA256 (۱۰۰k + Pepper)، نشست‌های hash‑شده با TTL لغزان،
  RBAC، قفل موقت پس از ۵ تلاش ناموفق، Audit Log، callback امضاشده‌ی HMAC برای فروشگاه.
- **آپلود واقعی**: `POST /api/upload` (multipart، ۵MB، تشخیص نوع از بایت‌های اول فایل) +
  `GET /api/file/:name` و بازبررسی بایت‌ها در endpoint رسانه.
- **هوش مصنوعی NaraRouter**: کلاینت کامل با پنل مدل به‌ازای هر جایگاه (plan/chat/vision/fast/code/
  classify)، سقوط خودکار روی خطای ۴۰۲/۴۰۳/۴۲۹/۵xx/تایم‌اوت، مود JSON، streaming (SSE) و
  System One؛ کلید فقط روی سرور می‌ماند. کارت وضعیت مدل‌ها در «تنظیمات» پنل ادمین.
- **بدن‌یار واقعی**: ویزارد شش‌سؤالی → برنامه‌ی تمرین/تغذیه‌ی ساخته‌شده با AI + چت زنده.
- **درگاه پرداخت**: زرین‌پال/زیبال/آی‌دی‌پی/پی‌آیر + callbacks + وب‌هوک فروشگاه +
  **ساخت خودکار حساب کایار** پس از پرداخت (kp-XXXX + رمز موقت + صفحه‌ی رسید) + گزارش سفارش‌ها.
- **حالت دوگانه‌ی فرانت**: تشخیص خودکار بک‌اند؛ اگر سرور نبود، همان منطق روی localStorage اجرا می‌شود.
- **آرشیو سورس**: `scripts/make-zip.sh` و اسکریپت انتشار `scripts/push-to-github.sh`.
- مستندسازی: `KAYAR.md`، `server/.env.example`، `README.md`.

### تست‌ها
- همه‌ی endpointها روی HTTP تست شده‌اند (ورود ادمین/عضو، وبلاگ، مرشد و مجموعه‌ها، داشبورد،
  لاگ audit، رسانه و آپلود واقعی، اعلان‌ها، تنظیمات، ساخت و ساخت گروهی حساب).
- هوش مصنوعی: سقوط خودکار از مدل‌های پرداختی (۴۰۲/۴۲۹) به مدل‌های رایگان و تولید برنامه‌ی فارسی.
- `npm run build` و `npm run server:build` بدون خطا.

⚠️ کلیدها/رمزها در `server/.env` (git-ignored) می‌مانند؛ برای راه‌اندازی از `.env.example` کپی بگیر.
```

---

## قبل از push یک‌بار چک کن که فایل حساس وارد نشده باشد

```bash
git status --short
git grep -n "sk-nry" || echo "✓ هیچ کلیدی در فایل‌های tracked نیست"
ls server/.env 2>/dev/null && echo "توجه: server/.env باید git-ignored باشد" || true
```

`.gitignore` شامل `server/.env`، `server/*.db*`، `server/uploads`، `dist/` و `node_modules/` است.
