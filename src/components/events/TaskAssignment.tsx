// src/components/events/TaskAssignment.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type TaskAssignmentProps = {
  onAssign: (did: string) => void;
};

export default function TaskAssignment({ onAssign }: TaskAssignmentProps) {
  const [did, setDid] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (did.trim().length === 0) return;
    onAssign(did.trim());
    setDid("");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Assegna a DID</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-2">
          <Label htmlFor="assignee">DID Operatore/Macchina</Label>
          <Input
            id="assignee"
            placeholder="did:iota:xyz..."
            value={did}
            onChange={(e) => setDid(e.target.value)}
          />
          <CardFooter className="px-0">
            <Button type="submit" className="w-full">
              Assegna
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
