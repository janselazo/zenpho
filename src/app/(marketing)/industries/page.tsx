import { permanentRedirect } from "next/navigation";

/** Legacy marketing industries hub — nav removed. */
export default function IndustriesMarketingRedirect() {
  permanentRedirect("/");
}
