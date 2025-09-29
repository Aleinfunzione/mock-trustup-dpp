import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

type Props = { fallbackTo?: string };

export default function BackButton({ fallbackTo = "/" }: Props) {
  const navigate = useNavigate();

  function onBack() {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallbackTo);
  }

  return (
    <Button variant="ghost" size="sm" onClick={onBack} aria-label="Indietro">
      <ChevronLeft className="h-4 w-4" />
    </Button>
  );
}
