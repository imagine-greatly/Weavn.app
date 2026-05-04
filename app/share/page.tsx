import { redirect } from "next/navigation";

/** Legacy `/share` without a token — public links use `/share/{shareToken}`. */
export default function ShareIndexRedirect() {
  redirect("/");
}
