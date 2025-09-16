import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/hooks/useAuth"

export default function Header() {
  const { logout } = useAuth()
  return (
    <header className="h-14 border-b px-4 flex items-center justify-between">
      <div className="font-semibold">TRUSTUP</div>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <Button variant="outline" onClick={logout}>Logout</Button>
      </div>
    </header>
  )
}
