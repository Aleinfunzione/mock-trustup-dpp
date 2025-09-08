import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="h-14 px-4 flex items-center justify-between border-b bg-background sticky top-0 z-40">
      <div className="font-semibold tracking-tight">TRUSTUP • MOCK</div>
      <ThemeToggle />
    </header>
  );
}
