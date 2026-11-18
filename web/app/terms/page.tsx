import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Terms of Use", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Use"
      intro="By using this converter you agree to the points below. They are short on purpose."
      sections={[
        { title: "Your files", body: (<p>You may only upload files you own or have the right to convert. Do not upload anything illegal or anything that harms others. We may stop access for misuse or for attempts to overload or break the service.</p>) },
        { title: "Keep your originals", body: (<p>Files are deleted automatically within about an hour, so download your results and keep your originals. Converting to a lossy format such as JPG or MP3 removes some detail, and tracing an image to SVG gives an approximation, not an exact copy. These limits are shown on each converter page.</p>) },
        { title: "Limits and plans", body: (<p>Free and anonymous use has daily limits on the number and size of files. Limits and plans can change, and the current ones are always shown on the site. Paid plans, when available, are billed as described at checkout.</p>) },
        { title: "No guarantee", body: (<p>The service is provided as it is. We work hard to make every conversion correct and we check each converter, but we cannot promise it is always available or free of errors, and we are not responsible for loss caused by using it.</p>) },
        { title: "Changes", body: (<p>We may update these terms. Continuing to use the converter after a change means you accept it.</p>) },
      ]}
    />
  );
}
