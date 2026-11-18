import type { FormatContent } from "../types";

const content: FormatContent = {
  "about": "MP3 is the most common audio format and plays on almost every device.",
  "bestFor": "Music, podcasts and sharing.",
  "watchOut": "It is lossy, so each time you re-encode, a little quality is lost.",
  "faqs": [
    {
      "q": "What bitrate should I pick?",
      "a": "192 kbps sounds great for most music. 320 kbps is the highest. 128 kbps is fine for speech."
    },
    {
      "q": "Does converting WAV to MP3 lose quality?",
      "a": "A little, by design. MP3 removes sounds you are unlikely to hear so the file becomes small."
    }
  ]
};

export default content;
