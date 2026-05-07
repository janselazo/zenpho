import { permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** Legacy marketing product pillar URLs — Platform menu removed. */
export default async function ProductMarketingRedirect({ params }: Props) {
  await params;
  permanentRedirect("/");
}
