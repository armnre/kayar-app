#!/usr/bin/env bash
# Publishes the prepared KAYAR repo to GitHub and (if allowed) opens a Pull Request.
#
#   export GITHUB_TOKEN=ghp_xxx        # token with `repo` scope
#   export GITHUB_REPO=owner/name      # default: armnre/kayar-app
#   ./scripts/push-to-github.sh        # optional: --base main  --branch feat/...
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="${GITHUB_REPO:-armnre/kayar-app}"
BRANCH="${BRANCH:-feat/real-backend-nararouter-payments}"
BASE="${BASE:-}"
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

if [[ -z "${TOKEN}" ]]; then
  echo "✘ GITHUB_TOKEN تنظیم نشده است."
  echo "  ۱) توکن بساز: https://github.com/settings/tokens  (scope: repo)"
  echo "  ۲) export GITHUB_TOKEN=ghp_xxx && ./scripts/push-to-github.sh"
  exit 1
fi

command -v git >/dev/null || { echo "✘ git نصب نیست"; exit 1; }
[[ -d .git ]] || git init -q

git config user.email "${GIT_EMAIL:-kayar@local}"
git config user.name  "${GIT_NAME:-KAYAR}"
git checkout -q -B "$BRANCH" 2>/dev/null || git checkout -q "$BRANCH"

git add -A
git diff --cached --quiet || git commit -q -m "feat: بک‌اند واقعی + هوش مصنوعی NaraRouter + درگاه پرداخت" \
  -m "Express + SQLite (27 endpoints، مترجم SQL پستگرس→SQLite، RBAC/audit/PBKDF2)، آپلود واقعی، AI چند-پنلی با سقوط خودکار، بدن‌یار زنده، درگاه پرداخت با ساخت خودکار حساب، حالت دوگانه‌ی فرانت."

# never publish secrets
if git ls-files --error-unmatch server/.env >/dev/null 2>&1; then
  echo "✘ server/.env در مخزن tracked شده است — حذفش کن: git rm --cached server/.env"; exit 1
fi
# only real-looking secrets (not placeholders like sk-nry-xxxxxxxx in .env.example / docs)
if git grep -Eq "sk-nry-[A-Za-z0-9]{16,}" -- . ':!*.example' ':!*.md' 2>/dev/null; then
  echo "✘ یک کلید API واقعی در فایل‌های tracked پیدا شد — پیش از push پاکش کن."
  git grep -En "sk-nry-[A-Za-z0-9]{16,}" -- . ':!*.example' ':!*.md' | head; exit 1
fi
echo "✓ چک امنیتی: هیچ کلیدی در فایل‌های tracked نیست"

ORIGIN_URL="https://x-access-token:${TOKEN}@github.com/${REPO}.git"
git remote remove origin 2>/dev/null || true
git remote add origin "$ORIGIN_URL"
echo "→ push شاخه‌ی ${BRANCH} به ${REPO}"
git push -u origin "$BRANCH" --quiet

# detect the default branch when BASE was not provided
if [[ -z "$BASE" ]]; then
  BASE=$(curl -sf -H "Authorization: Bearer ${TOKEN}" "https://api.github.com/repos/${REPO}" | sed -n 's/.*"default_branch": *"\([^"]*\)".*/\1/p')
  BASE="${BASE:-main}"
fi

TITLE="feat: بک‌اند واقعی (Express+SQLite) + هوش مصنوعی NaraRouter + درگاه پرداخت"
BODY=$(cat <<'MD'
افزوده‌های اصلی این تغییر:

- **بک‌اند واقعی**: Express + SQLite (WAL/migrations)، ۲۷ endpoint محصول روی `POST /api/<name>`،
  اعتبارسنجی zod، rate-limit و مترجم SQL پستگرس→SQLite (to_char/AT TIME ZONE،
  unnest(string_to_array())، COUNT(*) FILTER، DISTINCT ON، = ANY($n)، ::text، now() - interval).
- **امنیت**: PBKDF2-SHA256 (۱۰۰k + Pepper)، نشست‌های hash‑شده، RBAC، قفل موقت ورود، Audit Log،
  وب‌هوک امضاشده‌ی HMAC.
- **آپلود واقعی**: multipart با تشخیص نوع از بایت‌های اول فایل + سرو فایل + بازبررسی سمت رسانه.
- **هوش مصنوعی NaraRouter**: پنل مدل برای هر جایگاه (plan/chat/vision/fast/code/classify) با
  سقوط خودکار روی خطا، JSON mode، streaming و System One؛ کلید فقط روی سرور.
- **بدن‌یار زنده**: ساخت برنامه‌ی تمرین/تغذیه با AI + چت مربی.
- **درگاه پرداخت**: زرین‌پال/زیبال/آی‌دی‌پی/پی‌آیر + callback + وب‌هوک فروشگاه +
  ساخت خودکار حساب پس از پرداخت و صفحه‌ی رسید.
- **فرانت دوگانه**: تشخیص خودکار بک‌اند، در غیر این صورت اجرا روی localStorage.
- مستندات: KAYAR.md، README.md، server/.env.example، اسکریپت‌های zip/push.

تست‌شده: همه‌ی endpointها روی HTTP، آپلود واقعی، AI (سقوط از مدل‌های پرداختی ۴۰۲/۴۲۹ به رایگان)،
`npm run build` و `npm run server:build` بدون خطا.

⚠️ کلیدها در `server/.env` (git-ignored) می‌مانند.
MD
)

CREATE=$(curl -s -X POST "https://api.github.com/repos/${REPO}/pulls" \
  -H "Authorization: Bearer ${TOKEN}" -H "Accept: application/vnd.github+json" \
  -d "$(python3 - "$TITLE" "$BRANCH" "$BASE" "$BODY" <<'PY'
import json,sys
title, head, base, body = sys.argv[1:5]
print(json.dumps({"title": title, "head": head, "base": base, "body": body}))
PY
)")

if echo "$CREATE" | grep -q '"html_url"'; then
  echo "✓ Pull Request ساخته شد:"
  echo "$CREATE" | sed -n 's/.*"html_url": *"\([^"]*\)".*/  \1/p' | head -1
else
  echo "⚠️ ساخت خودکار PR انجام نشد (توکن دسترسی Pull Request نداشت یا شاخه‌ی پایه متفاوت است)."
  echo "  متن پاسخ: $(echo "$CREATE" | head -c 300)"
  echo "  دستی بساز: https://github.com/${REPO}/compare/${BASE}...${BRANCH}?expand=1"
fi

git remote set-url origin "https://github.com/${REPO}.git"   # drop the token from the remote URL
echo "✓ تمام. توکن از remote حذف شد."
