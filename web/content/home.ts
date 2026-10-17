/** Homepage static content. Answers rewritten honestly per the guide — no fake claims. */

export interface Faq {
  question: string;
  answer: string;
}

export const FAQS: Faq[] = [
  {
    question: "Is Quick Image Convert really free?",
    answer:
      "Yes. Every visitor gets a free daily quota of conversions — you'll see exactly how many you have left above the converter. No credit card, no trial expiry.",
  },
  {
    question: "Are my files private?",
    answer:
      "Files are sent over an encrypted connection, processed on our servers, and deleted automatically after 1 hour. We never sell your files or use them for anything except your conversion.",
  },
  {
    question: "Do I need to install anything or create an account?",
    answer:
      "No. The converter runs entirely in your browser and on our servers. You can create a free account to get a higher daily quota and keep your settings synced, but it's optional.",
  },
  {
    question: "Which formats can I convert between?",
    answer:
      "Common image formats (JPG, PNG, WebP, AVIF, GIF, SVG, PDF and more), RAW camera files, audio (MP3, WAV, FLAC, OGG, M4A) and video (MP4, WebM, MKV, MOV). The full pair directory is listed further down this page.",
  },
  {
    question: "Is there a file size limit?",
    answer:
      "Yes, and it depends on your plan — the upload area always shows the current limit before you add files. Larger files need more server time, so the cap keeps conversions fast for everyone.",
  },
  {
    question: "Will my converted files have a watermark?",
    answer:
      "Never. Output files are clean, with no watermark, no bundled software and no quality traps — what you download is just your converted file.",
  },
];

export const HOW_IT_WORKS = [
  {
    title: "Add your files",
    text: "Drag & drop, browse, paste from clipboard, or pick from your phone gallery. Add up to 100 files at once.",
  },
  {
    title: "Choose format & options",
    text: "Pick a target format — only real, supported pairs are offered. Tune quality, size and format options, or use a one-click preset.",
  },
  {
    title: "Convert & download",
    text: "Hit Convert all and download files individually, preview before/after, or grab everything as a single ZIP.",
  },
];
