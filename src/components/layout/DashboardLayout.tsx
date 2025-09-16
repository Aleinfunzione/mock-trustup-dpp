import Header from "@/components/layout/Header"
import Sidebar from "@/components/layout/Sidebar"
import { Outlet } from "react-router-dom"

export default function DashboardLayout() {
  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr]">
      <Header />
      <div className="grid grid-cols-[16rem_1fr]">
        <Sidebar />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
