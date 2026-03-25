import { redirect } from "next/navigation";

/** Legacy URL → renamed module */
export default function ProspectingColdOutreachRedirectPage() {
  redirect("/prospecting/playbook");
}
