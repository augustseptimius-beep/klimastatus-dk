export const metadata = { title: 'Linket er udløbet — Klimastatus.dk' };

export default function UdloebetPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md px-6 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Linket er udløbet</h1>
        <p className="mt-3 text-gray-500">
          Dette link er udløbet eller allerede brugt. Kontakt din klimakoordinator for at få et nyt link.
        </p>
      </div>
    </div>
  );
}
