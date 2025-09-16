// src/pages/dashboards/MachineDashboard.tsx
import * as React from "react";
import { useAuthStore } from "@/stores/authStore";
import EventList from "@/components/events/EventList";
import EventForm from "@/components/events/EventForm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function MachineDashboard() {
  const { currentUser } = useAuthStore();
  const [listKey, setListKey] = React.useState(0); // forza il remount della lista

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Registra evento macchina</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm
            assignedToDid={currentUser?.did}
            compact
            onCreated={() => setListKey((k) => k + 1)} // refresh lista
          />
        </CardContent>
      </Card>

      <EventList
        key={listKey}
        mode="assignee"
        title="Eventi di questa macchina"
        enableActions
        showIntegrity
      />
    </div>
  );
}
