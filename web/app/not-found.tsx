import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <p className="text-6xl font-extrabold text-text">404</p>
      <h1 className="mt-4 text-2xl font-bold text-text">Page not found</h1>
      <p className="mt-2 text-text-muted">
        The page you&rsquo;re looking for doesn&rsquo;t exist or was moved.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-contrast hover:bg-primary-hover"
      >
        Back to the converter
      </Link>
    </div>
  );
}
