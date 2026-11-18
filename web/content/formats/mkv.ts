import type { FormatContent } from "../types";

const content: FormatContent = {
  "about": "MKV is a flexible container that can hold many audio and subtitle tracks.",
  "bestFor": "Movies and recordings with several audio tracks.",
  "watchOut": "Many TVs and phones cannot play MKV.",
  "faqs": [
    {
      "q": "Are subtitles kept?",
      "a": "The main video and first audio track are kept. Extra tracks are not copied."
    },
    {
      "q": "Is MKV to MP4 lossless?",
      "a": "Often yes, because the video is copied without re-encoding when MP4 supports it."
    }
  ]
};

export default content;
