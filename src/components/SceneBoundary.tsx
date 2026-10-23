import { Component, type ReactNode } from "react";
import { ScanLine } from "lucide-react";

function webglAvailable(): boolean {
  if (typeof document === "undefined") return true;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Static stand-in for the 3D shop when WebGL is missing or the scene fails. */
export function StaticShopBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-dusk" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,#EA580C33,transparent_60%)]" />
      {/* shop silhouette */}
      <div className="absolute inset-x-0 bottom-0 mx-auto flex h-2/3 max-w-2xl flex-col items-center justify-end px-6">
        <div className="w-full rounded-t-md bg-[#3F6212] px-4 py-3 text-center">
          <span className="font-display text-lg font-bold tracking-wide text-[#FDE68A] sm:text-2xl">SHARMA KIRANA STORE</span>
        </div>
        <div className="h-6 w-[104%] max-w-none rounded-sm bg-[repeating-linear-gradient(90deg,#C2410C_0_34px,#FFF7ED_34px_68px)]" />
        <div className="flex h-40 w-full items-center justify-center rounded-b-md border-x-4 border-b-4 border-[#7C2D12] bg-[repeating-linear-gradient(180deg,#57534E_0_16px,#44403C_16px_32px)] sm:h-52">
          <div className="flex items-center gap-2 rounded-full bg-ink/70 px-4 py-2 text-sm font-medium text-ink-foreground backdrop-blur">
            <ScanLine className="size-4 text-primary" />
            Scroll to open the shop
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-10 bg-[#292524]" />
    </div>
  );
}

type Props = { children: ReactNode };
type State = { failed: boolean };

/** Catches any 3D scene crash (WebGL context loss, model load failure) so the page itself never goes down. */
export class SceneBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    console.error("Shop scene failed to render; showing static backdrop instead.", error);
  }

  override render() {
    if (this.state.failed || !webglAvailable()) return <StaticShopBackdrop />;
    return this.props.children;
  }
}
