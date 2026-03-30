import { permanentRedirect } from "next/navigation";

/** Legacy /deals route — deals merged into projects; send users to Projects. */
export default function DealsPage() {
  permanentRedirect("/products");
}
