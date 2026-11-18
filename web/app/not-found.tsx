import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">We could not find that page</h1>
      <p className="mt-3 text-muted">It may have moved, or that converter is not available right now.</p>
      <Link href="/"><Button className="mt-6" size="lg">Back to the converter</Button></Link>
    </div>
  );
}
