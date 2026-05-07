import { permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** Legacy marketing vertical pages — nav removed. */
export default async function IndustryMarketingRedirect({ params }: Props) {
  await params;
  permanentRedirect("/");
}
