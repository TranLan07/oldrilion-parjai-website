export default function Footer() {
  return (
    <footer className="border-t px-6 py-10 text-center" style={{ borderColor: "var(--beskar-600)", background: "var(--beskar-900)" }}>
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-3 h-px w-full" style={{ background: "var(--grad-edge)" }} />
        <p className="text-sm font-semibold uppercase tracking-[0.22em]"
           style={{ fontFamily: "var(--font-display)", color: "var(--gold-500)" }}>
          Parjai — Aliit ori&apos;shya tal&apos;din
        </p>
        <p className="mt-1 text-xs italic" style={{ fontFamily: "var(--font-body)", color: "var(--beskar-400)" }}>
          Le clan est plus que le sang.
        </p>
      </div>
    </footer>
  );
}
