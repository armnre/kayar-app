// Phase 3 features stay hidden behind these flags.

export const features = {
  coaches: false,
  campaigns: false,
  game: false,
  chat: false,
};

export const IMG = {
  heroMale: 'https://images.fillout.com/888622/bvjezbu9kd/generated-images/m7CVfYZ1XxoDXoHHPmRnjU/img_6hSskSlC6BwCKZ21.jpg',
  heroFemale: 'https://images.fillout.com/888622/bvjezbu9kd/generated-images/oxqDevwEubgV7SsJVPNB4N/img_n1JeLq9Rzgrcbrl3.jpg',
  morshed: 'https://images.fillout.com/888622/bvjezbu9kd/generated-images/afjACL6i7DDEtnZvwFmFHK/img_oPmkOrwF9MOWO-W_.jpg',
  run: 'https://images.fillout.com/888622/bvjezbu9kd/generated-images/jiupv5n9JM5Wv8yQ6PGx9P/img_0dCMOm1WQh9f_X8K.jpg',
};

const faDigits = '۰۱۲۳۴۵۶۷۸۹';
export const fa = (v: string | number) => String(v).replace(/\d/g, (d) => faDigits[Number(d)]);
export const faNum = (n: number) => fa(n.toLocaleString('en-US').replace(/,/g, '٬'));
export const toman = (n: number) => `${faNum(n)} تومان`;
export const faDate = (d: Date | string) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
