import React from "react";
import { Outlet } from "react-router-dom";
import Header from "@/components/layout/Header";

export default function MinimalLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
}
