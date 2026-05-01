/** Home hero trust strip — swap `public/trusted-by/*.svg` for official client marks when you have them. */
export type TrustedLocalBusiness = {
  name: string;
  logoSrc: string;
  width: number;
  height: number;
};

export const trustedLocalBusinesses: TrustedLocalBusiness[] = [
  { name: "TapTok", logoSrc: "/trusted-by/taptok.svg", width: 100, height: 32 },
  {
    name: "Apex Inspection Pro",
    logoSrc: "/trusted-by/apex-inspection-pro.svg",
    width: 260,
    height: 32,
  },
  { name: "TQMuch", logoSrc: "/trusted-by/tqmuch.svg", width: 108, height: 32 },
  { name: "SoldTools", logoSrc: "/trusted-by/soldtools.svg", width: 124, height: 32 },
  { name: "Bravaz Dental", logoSrc: "/trusted-by/bravaz-dental.svg", width: 200, height: 32 },
  { name: "Truedent Dentistry", logoSrc: "/trusted-by/truedent-dentistry.svg", width: 260, height: 32 },
  { name: "Real Cafe", logoSrc: "/trusted-by/real-cafe.svg", width: 120, height: 32 },
  { name: "Braojos Insurance", logoSrc: "/trusted-by/braojos-insurance.svg", width: 240, height: 32 },
  {
    name: "Yaber Dental Partners",
    logoSrc: "/trusted-by/yaber-dental-partners.svg",
    width: 300,
    height: 32,
  },
  {
    name: "Longan's Wedding Venue",
    logoSrc: "/trusted-by/longans-wedding-venue.svg",
    width: 310,
    height: 32,
  },
];
