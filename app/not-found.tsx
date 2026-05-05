export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">SnapCull Gallery</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950">Event gallery not found</h1>
        <p className="mt-3 text-base text-slate-600">
          This event link is invalid or the gallery has not been published yet.
        </p>
      </section>
    </main>
  );
}
