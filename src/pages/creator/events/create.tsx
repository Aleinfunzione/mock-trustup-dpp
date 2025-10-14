// src/pages/creator/events/create.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import EventForm from "@/components/events/EventForm";

export default function CreatorEventCreatePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Creator • Registra evento</CardTitle>
      </CardHeader>
      <CardContent>
        <EventForm compact />
      </CardContent>
    </Card>
  );
}
