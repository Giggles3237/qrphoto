import { EventForm } from "@/components/admin/event-form";

export default function NewEventPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Create Event</h1>
      <EventForm mode="create" />
    </div>
  );
}
