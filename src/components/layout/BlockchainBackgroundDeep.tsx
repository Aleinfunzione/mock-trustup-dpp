import { useCallback } from "react";
import Particles from "react-tsparticles";

type Palette = "cyan" | "mint" | "violet";
const PALETTES: Record<Palette, string[]> = {
  cyan: ["#22d3ee", "#60a5fa", "#5eead4"],
  mint: ["#2dd4bf", "#99f6e4", "#34d399"],
  violet: ["#a78bfa", "#7dd3fc", "#e879f9"],
};

export default function BlockchainBackgroundDeep({ palette = "cyan" }: { palette?: Palette }) {
  const colors = PALETTES[palette];

  // import dinamico: evita errori di tipi/risoluzione
  const init = useCallback(async (engine: unknown) => {
    const { loadSlim } = await import("tsparticles-slim");
    await loadSlim(engine as any);
  }, []);

  const interactivity = (force: number, smooth = 20) => ({
    detectsOn: "window" as const,
    events: { onHover: { enable: true, mode: "grab", parallax: { enable: true, force, smooth } }, resize: true },
    modes: { grab: { distance: 200, links: { opacity: 0.75 } } },
  });

  return (
    <div className="absolute inset-0 -z-10">
      <Particles
        id="trustup-back"
        init={init}
        className="absolute inset-0 pointer-events-none [filter:drop-shadow(0_0_6px_rgba(34,211,238,0.6))]"
        options={{
          fullScreen: { enable: false },
          background: { color: "#000000ff" },
          fpsLimit: 60,
          detectRetina: true,
          interactivity: interactivity(40, 20),
          particles: {
            number: { value: 90, density: { enable: true, area: 900 } },
            color: { value: colors },
            links: { enable: true, distance: 150, color: colors[0], opacity: 0.22, width: 1 },
            move: { enable: true, speed: 0.25, outModes: { default: "out" } },
            opacity: { value: 0.35 },
            size: { value: { min: 1, max: 2 } },
            shape: { type: "circle" }
          }
        }}
      />
      <Particles
        id="trustup-front"
        init={init}
        className="absolute inset-0 pointer-events-none mix-blend-screen"
        options={{
          fullScreen: { enable: false },
          background: { color: "transparent" },
          fpsLimit: 60,
          detectRetina: true,
          interactivity: interactivity(70, 18),
          particles: {
            number: { value: 45, density: { enable: true, area: 800 } },
            color: { value: colors },
            links: { enable: true, distance: 100, color: colors[1], opacity: 0.45, width: 1.2 },
            move: { enable: true, speed: 0.8, outModes: { default: "out" } },
            opacity: { value: 0.6 },
            size: { value: { min: 2, max: 4.5 } },
            shape: { type: "circle" }
          }
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.55)_70%)]" />
    </div>
  );
}
