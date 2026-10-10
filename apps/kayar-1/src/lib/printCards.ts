import QRCode from 'qrcode';

export const APP_URL = 'https://kayar.kapoosh.ir/app';
export type CardData = { name: string; username: string; password: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const qrDataUrl = () => QRCode.toDataURL(APP_URL, { margin: 1, width: 240, errorCorrectionLevel: 'M' });

export const shareText = (c: CardData) =>
  `سلام ${c.name}، حساب کایار شما ساخته شد.\nورود: ${APP_URL}\nنام کاربری: ${c.username}\nرمز موقت: ${c.password}\nبعد از اولین ورود رمز را تغییر بده.`;

/** Opens a print-ready sheet of one or many credential cards (8 per A4 page). */
export async function printCards(cards: CardData[]) {
  const qr = await qrDataUrl();
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) throw new Error('پنجره‌ی چاپ باز نشد؛ اجازه‌ی پاپ‌آپ را بدهید.');
  const body = cards.map((c) => `
    <div class="card">
      <div class="top"><b class="brand">KAYAR</b><span>کایار · همراه کاپوش</span></div>
      <div class="row">
        <img src="${qr}" alt="QR" />
        <div class="info">
          <div class="name">${esc(c.name)}</div>
          <div>نام کاربری: <b dir="ltr">${esc(c.username)}</b></div>
          <div>رمز موقت: <b dir="ltr" class="pw">${esc(c.password)}</b></div>
          <div class="hint">QR را اسکن کن یا به kayar.kapoosh.ir/app برو. بعد از ورود رمز را تغییر بده.</div>
        </div>
      </div>
    </div>`).join('');
  w.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>کارت ورود کایار</title>
  <style>
    @page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:Vazirmatn,Tahoma,sans-serif;margin:0;color:#0B0D0E}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:6mm}
    .card{border:1.5px dashed #999;border-radius:12px;padding:5mm;break-inside:avoid;height:62mm}
    .top{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#555}.brand{font-family:Arial;letter-spacing:3px;font-size:14px;color:#000}
    .row{display:flex;gap:4mm;margin-top:3mm;align-items:center}img{width:32mm;height:32mm}
    .info{font-size:12px;line-height:1.9;min-width:0}.name{font-weight:800;font-size:14px}.pw{font-family:monospace;font-size:14px;letter-spacing:1px}
    .hint{font-size:10px;color:#555;line-height:1.6;margin-top:2mm}
  </style></head><body><div class="grid">${body}</div><script>window.onload=()=>{window.print()}<\/script></body></html>`);
  w.document.close();
}

export function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
