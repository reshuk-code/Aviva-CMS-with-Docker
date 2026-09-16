import { richDocToPlainText, toRichDoc } from "@/lib/rich-text";
import type { RichNode } from "@/types/rich-text";

/**
 * On-page SEO grading, in the spirit of Rank Math and Yoast.
 *
 * Deliberately free of `server-only` and of any database import: the editor
 * runs this on every keystroke in the browser, and the same function grades a
 * record on the server. One implementation, one score, no drift.
 *
 * What it is not: a ranking prediction. Nobody outside Google can make one.
 * These are the mechanical checks a careful editor would otherwise run by eye
 * — is the phrase in the title, is the description the right length, is there
 * a subheading — and a score is just how many of them passed. It is a
 * checklist with arithmetic, and the copy says so, because an editor who
 * believes 100/100 means "will rank" has been misled by the tool.
 */

export type SeoCheckStatus = "good" | "warning" | "bad";

export interface SeoCheck {
  id: string;
  label: string;
  status: SeoCheckStatus;
  /** One sentence on what was found, and what to do when it is not good. */
  detail: string;
  /**
   * Relative importance. Keyword placement outweighs cosmetic length rules,
   * so a page cannot score well by padding its title while ignoring its
   * subject.
   */
  weight: number;
}

export interface SeoAnalysis {
  score: number;
  /** "Needs work" | "OK" | "Good", derived from the score. */
  grade: "none" | "poor" | "ok" | "good";
  checks: SeoCheck[];
}

export interface SeoAnalysisInput {
  focusKeyword: string;
  /** The effective SEO title, after the form's fallback has been applied. */
  title: string;
  description: string;
  /** Path or bare slug — either is fine, only the words are read. */
  slug: string;
  /** Prose as stored: a serialised rich text document, or Markdown. */
  content: string;
  featuredImage: string | null;
}

/* ------------------------------------------------------------------ ranges */

const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESCRIPTION_MIN = 120;
const DESCRIPTION_MAX = 160;
const CONTENT_MIN_WORDS = 300;
const DENSITY_MIN = 0.5;
const DENSITY_MAX = 2.5;

/* ------------------------------------------------------------------ text */

/**
 * The combining marks NFD splits an accented letter into.
 *
 * Built from a string rather than written as a regex literal so the range is
 * spelled in escapes. Written literally the characters are invisible in a
 * source file, and they do not survive every editor and pipeline they pass
 * through.
 */
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

/**
 * Lowercased and stripped of punctuation and accents.
 *
 * Matching has to survive the difference between what an editor types into the
 * keyword box and how the phrase appears in prose — "Everest Base Camp,"
 * with a comma, or "Pokhara's" with an apostrophe.
 */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function wordCount(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Occurrences of the keyword as a whole phrase, not as a substring. */
function countPhrase(haystack: string, phrase: string): number {
  if (!phrase) return 0;

  const words = phrase.split(" ");
  const source = haystack.split(" ");
  let found = 0;

  for (let index = 0; index + words.length <= source.length; index += 1) {
    if (words.every((word, offset) => source[index + offset] === word)) {
      found += 1;
    }
  }

  return found;
}

/** Every heading's text, so the keyword can be looked for in subheadings. */
function headings(nodes: RichNode[]): string[] {
  const found: string[] = [];

  function walk(node: RichNode) {
    if (node.type === "heading") {
      found.push(richDocToPlainText({ type: "doc", content: [node] }));
    }
    for (const child of node.content ?? []) walk(child);
  }

  for (const node of nodes) walk(node);
  return found;
}

function hasLink(nodes: RichNode[]): boolean {
  let found = false;

  function walk(node: RichNode) {
    if (found) return;
    if (node.marks?.some((mark) => mark.type === "link")) {
      found = true;
      return;
    }
    for (const child of node.content ?? []) walk(child);
  }

  for (const node of nodes) walk(node);
  return found;
}

/* -------------------------------------------------------------- analysis */

export function analyseSeo(input: SeoAnalysisInput): SeoAnalysis {
  const keyword = normalise(input.focusKeyword);
  const doc = toRichDoc(input.content);
  const plain = richDocToPlainText(doc);

  const words = wordCount(plain);
  const body = normalise(plain);
  const title = normalise(input.title);
  const description = normalise(input.description);
  const slug = normalise(input.slug.replace(/[/_-]+/g, " "));

  const checks: SeoCheck[] = [];
  const add = (check: SeoCheck) => checks.push(check);

  /* ----------------------------------------------------- keyword checks */

  if (!keyword) {
    add({
      id: "focus-keyword",
      label: "Focus keyword set",
      status: "bad",
      detail:
        "Add the phrase this page should rank for. Everything below is graded against it.",
      weight: 3,
    });
  } else {
    add({
      id: "focus-keyword",
      label: "Focus keyword set",
      status: "good",
      detail: `Grading this page against "${input.focusKeyword.trim()}".`,
      weight: 3,
    });

    add({
      id: "keyword-in-title",
      label: "Keyword in the SEO title",
      status: countPhrase(title, keyword) > 0 ? "good" : "bad",
      detail:
        countPhrase(title, keyword) > 0
          ? "The title contains the focus keyword."
          : "The title does not contain the focus keyword. This is the single most useful place for it.",
      weight: 3,
    });

    add({
      id: "keyword-in-description",
      label: "Keyword in the meta description",
      status: countPhrase(description, keyword) > 0 ? "good" : "warning",
      detail:
        countPhrase(description, keyword) > 0
          ? "The meta description contains the focus keyword."
          : "The description does not mention the keyword. It is bolded in results when it matches the search.",
      weight: 2,
    });

    add({
      id: "keyword-in-slug",
      label: "Keyword in the URL",
      status: countPhrase(slug, keyword) > 0 ? "good" : "warning",
      detail:
        countPhrase(slug, keyword) > 0
          ? "The URL contains the focus keyword."
          : "The URL does not contain the keyword. Worth fixing before publishing, not after — changing a live URL costs you the links to it.",
      weight: 2,
    });

    // "Early" rather than "the first paragraph": the opening of a page is not
    // reliably one paragraph, and the first hundred words is the span a reader
    // decides on.
    const opening = body.split(" ").slice(0, 100).join(" ");
    add({
      id: "keyword-early",
      label: "Keyword in the opening",
      status: countPhrase(opening, keyword) > 0 ? "good" : "warning",
      detail:
        countPhrase(opening, keyword) > 0
          ? "The keyword appears in the first hundred words."
          : "The keyword does not appear in the first hundred words. Say what the page is about up front.",
      weight: 2,
    });

    const inHeading = headings(doc.content).some(
      (heading) => countPhrase(normalise(heading), keyword) > 0,
    );
    add({
      id: "keyword-in-subheading",
      label: "Keyword in a subheading",
      status: inHeading ? "good" : "warning",
      detail: inHeading
        ? "At least one subheading contains the keyword."
        : "No subheading contains the keyword.",
      weight: 1,
    });

    const occurrences = countPhrase(body, keyword);
    const density = words > 0 ? (occurrences * wordCount(keyword) * 100) / words : 0;
    const rounded = density.toFixed(1);

    add({
      id: "keyword-density",
      label: "Keyword density",
      status:
        words < 50
          ? "warning"
          : density < DENSITY_MIN
            ? "warning"
            : density > DENSITY_MAX
              ? "bad"
              : "good",
      detail:
        words < 50
          ? "Too little prose to judge density."
          : density > DENSITY_MAX
            ? `${rounded}% — the keyword is overused. Above ${DENSITY_MAX}% reads as padding to a person and to a search engine.`
            : density < DENSITY_MIN
              ? `${rounded}% — the keyword appears ${occurrences} time${occurrences === 1 ? "" : "s"}. Aim for ${DENSITY_MIN}-${DENSITY_MAX}%.`
              : `${rounded}%, which is in the ${DENSITY_MIN}-${DENSITY_MAX}% range.`,
      weight: 2,
    });
  }

  /* -------------------------------------------------------- page checks */

  const titleLength = input.title.trim().length;
  add({
    id: "title-length",
    label: "Title length",
    status:
      titleLength === 0
        ? "bad"
        : titleLength < TITLE_MIN || titleLength > TITLE_MAX
          ? "warning"
          : "good",
    detail:
      titleLength === 0
        ? "No title to show in a search result."
        : titleLength > TITLE_MAX
          ? `${titleLength} characters. Google truncates around ${TITLE_MAX}.`
          : titleLength < TITLE_MIN
            ? `${titleLength} characters. There is room for more.`
            : `${titleLength} characters, which fits.`,
    weight: 2,
  });

  const descriptionLength = input.description.trim().length;
  add({
    id: "description-length",
    label: "Meta description length",
    status:
      descriptionLength === 0
        ? "bad"
        : descriptionLength < DESCRIPTION_MIN || descriptionLength > DESCRIPTION_MAX
          ? "warning"
          : "good",
    detail:
      descriptionLength === 0
        ? "No description, so Google will invent one from the page."
        : descriptionLength > DESCRIPTION_MAX
          ? `${descriptionLength} characters. Anything past ${DESCRIPTION_MAX} is cut off.`
          : descriptionLength < DESCRIPTION_MIN
            ? `${descriptionLength} characters. Aim for ${DESCRIPTION_MIN}-${DESCRIPTION_MAX}.`
            : `${descriptionLength} characters, which fits.`,
    weight: 2,
  });

  add({
    id: "content-length",
    label: "Amount of prose",
    status: words === 0 ? "bad" : words < CONTENT_MIN_WORDS ? "warning" : "good",
    detail:
      words === 0
        ? "There is no prose on this record yet."
        : words < CONTENT_MIN_WORDS
          ? `${words} words. Thin pages rarely rank; ${CONTENT_MIN_WORDS}+ is a reasonable floor.`
          : `${words} words.`,
    weight: 2,
  });

  add({
    id: "subheadings",
    label: "Subheadings",
    status: headings(doc.content).length > 0 ? "good" : "warning",
    detail:
      headings(doc.content).length > 0
        ? `${headings(doc.content).length} subheading${headings(doc.content).length === 1 ? "" : "s"} break the page up.`
        : "No subheadings. A wall of text is hard to scan.",
    weight: 1,
  });

  add({
    id: "links",
    label: "Links in the prose",
    status: hasLink(doc.content) ? "good" : "warning",
    detail: hasLink(doc.content)
      ? "The prose links out to at least one other page."
      : "No links. Linking to your other trips and destinations helps both readers and crawlers.",
    weight: 1,
  });

  add({
    id: "featured-image",
    label: "Featured image",
    status: input.featuredImage ? "good" : "warning",
    detail: input.featuredImage
      ? "Set, so social shares and listings have something to show."
      : "No featured image. Shared links will be a bare box.",
    weight: 1,
  });

  /* ------------------------------------------------------------- scoring */

  // A warning is worth half a pass. The alternative — pass or fail — makes a
  // page with eight near-misses look identical to one that is genuinely broken.
  const earned = checks.reduce((total, check) => {
    const value = check.status === "good" ? 1 : check.status === "warning" ? 0.5 : 0;
    return total + value * check.weight;
  }, 0);

  const possible = checks.reduce((total, check) => total + check.weight, 0);
  const score = possible > 0 ? Math.round((earned / possible) * 100) : 0;

  return {
    score,
    grade: !keyword ? "none" : score >= 80 ? "good" : score >= 55 ? "ok" : "poor",
    checks,
  };
}
