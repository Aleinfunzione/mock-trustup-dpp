// src/pages/dashboards/OperatorDashboard.tsx
import * as React from "react";
import { useAuthStore } from "@/stores/authStore";
import EventList from "@/components/events/EventList";
import EventForm from "@/components/events/EventForm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function OperatorDashboard() {
  const { currentUser } = useAuthStore();
  const [listKey, setListKey] = React.useState(0); // forza il remount della lista

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crea evento (assegnato a me)</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm
            assignedToDid={currentUser?.did}
            compact
            onCreated={() => setListKey((k) => k + 1)} // refresh "I miei task"
          />
        </CardContent>
      </Card>

      <EventList
        key={listKey}
        mode="assignee"
        title="I miei task"
        enableActions
        showIntegrity
      />
    </div>
  );
}
