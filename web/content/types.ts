export type Faq = { q: string; a: string };
export type FormatContent = {
  about: string; // what the format is
  bestFor: string;
  watchOut: string;
  faqs: Faq[]; // two or three, used by the pair pages
};
