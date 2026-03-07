import { redirect } from "next/navigation";

export default function NewRedirect() {
  redirect("/admin/events/new");
}
