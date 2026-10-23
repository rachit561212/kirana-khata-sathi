import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, LoaderCircle, QrCode, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseBillQr, type BillQrDraft } from "@/lib/bill-qr";

export function BillQrScanner({ onRead, disabled }: { onRead: (draft: BillQrDraft) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<BillQrDraft>();
  const video = useRef<HTMLVideoElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const controls = useRef<{ stop: () => void } | undefined>(undefined);
  const generation = useRef(0);

  const stop = () => { generation.current++; controls.current?.stop(); controls.current = undefined; setCamera(false); setBusy(false); };
  useEffect(() => () => { generation.current++; controls.current?.stop(); }, []);
  const read = (text: string) => {
    stop();
    try { setDraft(parseBillQr(text)); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not read this bill QR."); }
  };
  const startCamera = async () => {
    stop(); setError(""); setDraft(undefined); setBusy(true); setCamera(true);
    const run = generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera is unavailable. Choose a QR photo instead.");
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      if (run !== generation.current || !video.current) return;
      const reader = new BrowserQRCodeReader();
      const active = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } }, audio: false }, video.current, (result, _error, scanner) => {
        if (run !== generation.current) { scanner.stop(); return; }
        if (result) { scanner.stop(); read(result.getText()); }
      });
      if (run !== generation.current) { active.stop(); return; }
      controls.current = active; setBusy(false);
    } catch (e) {
      if (run !== generation.current) return;
      stop();
      setError(e instanceof DOMException && e.name === "NotAllowedError" ? "Camera permission was denied. Allow the camera or choose a QR photo." : "Could not open the camera. Choose a QR photo instead.");
    }
  };
  const readPhoto = async (image: File) => {
    stop(); setError(""); setDraft(undefined); setBusy(true);
    const run = generation.current;
    let url: string | undefined;
    try {
      if (!["image/png", "image/jpeg", "image/webp"].includes(image.type) || image.size === 0 || image.size > 10 * 1024 * 1024) throw new Error("Choose a JPG, PNG or WebP QR photo under 10 MB.");
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      if (run !== generation.current) return;
      url = URL.createObjectURL(image);
      const result = await new BrowserQRCodeReader().decodeFromImageUrl(url);
      if (run === generation.current) read(result.getText());
    } catch (e) {
      if (run === generation.current) setError(e instanceof Error && e.message.startsWith("Choose") ? e.message : "No readable QR found. Try a clear, close-up photo; no order was added.");
    } finally { if (url) URL.revokeObjectURL(url); if (run === generation.current) setBusy(false); }
  };

  return <Dialog open={open} onOpenChange={(value) => { stop(); setOpen(value); setError(""); setDraft(undefined); }}>
    <Button variant="outline" size="icon" title="Scan bill QR" aria-label="Scan bill QR" disabled={disabled} onClick={() => setOpen(true)} className="shrink-0"><QrCode className="h-5 w-5" /></Button>
    <DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>Scan bill QR</DialogTitle><DialogDescription>Supplier’s bulk order</DialogDescription></DialogHeader>
      {!draft && <>
        <div className="relative aspect-[4/3] overflow-hidden rounded-md border bg-muted">
          <video ref={video} autoPlay muted playsInline aria-label="QR camera preview" className={`h-full w-full object-cover ${camera ? "" : "hidden"}`} />
          {!camera && <QrCode className="absolute inset-0 m-auto h-16 w-16 text-muted-foreground" />}
          {busy && <LoaderCircle className="absolute right-3 top-3 h-5 w-5 animate-spin text-foreground" />}
        </div>
        <div className="flex flex-wrap gap-2">
          {camera ? <Button variant="outline" onClick={stop}><Square className="h-4 w-4" /> Stop camera</Button> : <Button onClick={() => void startCamera()} disabled={busy}><Camera className="h-4 w-4" /> Use camera</Button>}
          <Button variant="outline" disabled={busy} onClick={() => file.current?.click()}><ImagePlus className="h-4 w-4" /> Choose QR photo</Button>
          <input ref={file} aria-label="QR photo" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const image = e.target.files?.[0]; if (image) void readPhoto(image); e.target.value = ""; }} />
        </div>
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {draft && <>
        <div className="border-b pb-3"><p className="break-words font-semibold">{draft.vendor}</p><p className="text-sm text-muted-foreground">{draft.date ?? "Order date not in QR"} · {draft.items.length} items</p></div>
        <ul className="max-h-64 overflow-y-auto divide-y">{draft.items.map((item, i) => <li key={i} className="py-2 text-sm"><p className="break-words font-medium">{item.name}</p><p className="font-mono text-muted-foreground">{item.qty} × ₹{item.rate.toLocaleString("en-IN")} · GST {item.gst}%</p></li>)}</ul>
        <p className="text-sm text-muted-foreground">Replaces the current supplier and items. Check the date, category and payment before saving.</p>
        <Button onClick={() => { onRead(draft); stop(); setOpen(false); setDraft(undefined); }}>Use these items</Button>
        <Button variant="ghost" onClick={() => { setDraft(undefined); setError(""); }}>Scan another QR</Button>
      </>}
    </DialogContent>
  </Dialog>;
}