import { redirect } from 'next/navigation';

type Props = { params: Promise<{ kommune: string }> };

// /k/<slug> uden understi → send til dashboard.
export default async function KommuneIndex({ params }: Props) {
  const { kommune: slug } = await params;
  redirect(`/k/${slug}/dashboard`);
}
