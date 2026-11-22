import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy-policy" } };

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This page explains what happens to your files and your data when you use the converter, in plain words."
      sections={[
        { title: "Your files", body: (<>
          <p>When you convert a file, it is uploaded to our server, converted there, and the result is sent back to you. This is how the converter works, so your files do leave your device.</p>
          <p>Uploaded files and converted results are deleted automatically, within one hour by default. They are processed by software only. We do not open them, share them or sell them.</p>
        </>) },
        { title: "What we keep", body: (<ul className="list-disc space-y-1.5 pl-5">
          <li>A one-way scrambled version of your IP address, used only to count daily conversions for visitors without an account. We do not store the readable address in our database.</li>
          <li>If you create an account: your email address, password hash and account plan. Passwords are protected with one-way Argon2 hashing; we cannot read your password.</li>
          <li>A secure, HttpOnly session cookie that keeps you signed in. You can end it by signing out, and password changes end other sessions.</li>
          <li>Simple statistics about each conversion: which formats, how large, how long it took, and whether it worked. These never include the content of your files.</li>
          <li>In your browser only: your theme and the last options you used, so the tool remembers them.</li>
        </ul>) },
        { title: "Other companies", body: (<ul className="list-disc space-y-1.5 pl-5">
          <li>If advertising is switched on, an ad network may place cookies in your browser. Pro members never see ads.</li>
          <li>Our hosting provider stores the files temporarily while they are processed.</li>
        </ul>) },
        { title: "Your choices", body: (<p>You can delete a file from the page as soon as you are done, and it is removed automatically either way. You can ask us to delete your account and its data at any time.</p>) },
      ]}
    />
  );
}
