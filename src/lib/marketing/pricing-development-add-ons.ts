export type PricingDevelopmentAddOn = {
  id: string;
  title: string;
  /** Dollar amount only; UI shows “Starting at {startingPrice}”. */
  startingPrice: string;
};

/** Shown below the main pricing comparison on /pricing. */
export const pricingDevelopmentAddOns: PricingDevelopmentAddOn[] = [
  {
    id: "ecommerce",
    title: "Ecommerce Website Development",
    startingPrice: "$1,500",
  },
  {
    id: "web-app",
    title: "Web App Development",
    startingPrice: "$2,500",
  },
  {
    id: "mobile-app",
    title: "Mobile App Development",
    startingPrice: "$3,500",
  },
];
