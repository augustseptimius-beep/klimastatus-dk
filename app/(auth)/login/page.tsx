import { LoginForm } from '@/components/login-form';

export const metadata = { title: 'Log ind — Klimastatus.dk' };

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Klimastatus.dk</h1>
        <p className="mt-1 text-sm text-gray-500">Log ind for at fortsætte</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <LoginForm />
      </div>
    </div>
  );
}
