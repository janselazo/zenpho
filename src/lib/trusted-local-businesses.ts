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
];
