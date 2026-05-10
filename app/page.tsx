export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <main className="flex max-w-2xl flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Klimastatus.dk
          </h1>
          <p className="text-lg text-gray-600">
            Klimarapportering og CCTF-selvevaluering for danske kommuner
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-8 py-6">
          <p className="text-sm text-gray-500">
            Platformen er under opbygning. Kontakt os for tidlig adgang.
          </p>
        </div>
      </main>
    </div>
  );
}
