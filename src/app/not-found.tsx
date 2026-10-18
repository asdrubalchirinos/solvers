import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <h1 className="text-2xl font-bold">No encontramos esa página</h1>
      <Link href="/" className="mt-6 inline-block text-sky-600 hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
