import { useEffect, useState } from 'react';
import { Printer, MessageCircle, Copy, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { KButton, CopyField } from '../kit';
import { qrDataUrl, printCards, shareText, type CardData } from '../../lib/printCards';

/** Shown exactly once after create/reset — the password can't be retrieved later. */
export function Credentials({ card, phone }: { card: CardData; phone?: string }) {
  const [qr, setQr] = useState<string>();
  useEffect(() => { qrDataUrl().then(setQr); }, []);
  const text = shareText(card);
  const wa = `https://wa.me/${phone ? '98' + phone.replace(/^0/, '') : ''}?text=${encodeURIComponent(text)}`;
  const sms = `sms:${phone ?? ''}?body=${encodeURIComponent(text)}`;
  return (
    <div className="space-y-3">
      <p className="flex gap-2 rounded-2xl bg-gold/10 p-3 text-sm leading-6 text-gold"><ShieldAlert className="h-5 w-5 shrink-0" />این رمز فقط همین یک‌بار نمایش داده می‌شود. آن را به مشتری بده یا کارت را چاپ کن.</p>
      <CopyField label="نام کاربری" value={card.username} />
      <CopyField label="رمز موقت" value={card.password} />
      <div className="flex items-center gap-4 rounded-3xl bg-white p-4 text-[#0B0D0E]">
        {qr ? <img src={qr} alt="QR ورود به کایار" className="h-24 w-24 shrink-0" /> : <div className="h-24 w-24 shrink-0 animate-pulse rounded bg-black/10" />}
        <div className="min-w-0 text-sm leading-7"><b>{card.name}</b><div>نام کاربری: <b className="font-latin" dir="ltr">{card.username}</b></div><div className="text-xs text-black/60">بعد از ورود رمز را تغییر بده.</div></div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KButton variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(text).then(() => toast.success('متن کپی شد'))}><Copy className="h-4 w-4" />کپی متن</KButton>
        <KButton variant="outline" size="sm" onClick={() => { window.location.href = sms; }}>پیامک</KButton>
        <KButton variant="outline" size="sm" onClick={() => window.open(wa, '_blank', 'noopener')}><MessageCircle className="h-4 w-4" />واتس‌اپ</KButton>
        <KButton size="sm" onClick={() => printCards([card]).catch((e) => toast.error(e.message))}><Printer className="h-4 w-4" />کارت چاپی</KButton>
      </div>
    </div>
  );
}
