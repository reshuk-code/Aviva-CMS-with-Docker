import type { ContentRecord, BaseRecord, ID } from "./common";
import type { SeoMeta } from "./seo";
import type { PageBody } from "./blocks";

/* ------------------------------------------------------------------ media */

/** Coarse buckets the media library filters by. See `mediaKindFor()`. */
export const MEDIA_KINDS = [
  "image",
  "video",
  "document",
  "audio",
  "other",
] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number];

export interface MediaItem extends BaseRecord {
  /** Path within the storage bucket. The adapter turns this into a URL. */
  key: string;
  url: string;
  filename: string;
  mimeType: string;
  kind: MediaKind;
  /** Bytes. */
  size: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  description: string | null;
  /** Simple single-level folder, e.g. "tours" or "team". Null = root. */
  folder: string | null;
  uploadedBy: ID | null;
}

/* ------------------------------------------------------------------- blog */

export interface Post extends ContentRecord {
  title: string;
  slug: string;
  excerpt: string | null;
  /** Markdown body. Rendered by the frontend, not by the CMS. */
  content: string;
  body: PageBody;
  featuredImage: string | null;
  authorId: ID | null;
  authorName: string | null;
  category: string | null;
  tags: string[];
  readingMinutes: number | null;
  seo: SeoMeta;
}

/* ----------------------------------------------------------- destinations */

export interface Destination extends ContentRecord {
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string;
  featuredImage: string | null;
  gallery: string[];
  country: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  highlights: string[];
  bestSeason: string[];
  /** Free text, e.g. "7-14 days". Tour packages carry precise durations. */
  typicalDuration: string | null;
  featured: boolean;
  order: number;
  seo: SeoMeta;
}

/* -------------------------------------------------------------- activities */

export interface Activity extends ContentRecord {
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  featuredImage: string | null;
  order: number;
  seo: SeoMeta;
}

/* ----------------------------------------------------------------- tours */

export const TOUR_DIFFICULTIES = [
  "easy",
  "moderate",
  "challenging",
  "strenuous",
  "extreme",
] as const;

export type TourDifficulty = (typeof TOUR_DIFFICULTIES)[number];

export interface ItineraryDay {
  id: string;
  day: number;
  title: string;
  description: string;
  accommodation: string | null;
  meals: string[];
  activities: string[];
  images: string[];
  /** Metres. Useful for trekking itineraries. */
  altitude: number | null;
  /** Free text, e.g. "5-6 hrs". */
  duration: string | null;
}

export interface TourFaq {
  id: string;
  question: string;
  answer: string;
}

export interface TourPackage extends ContentRecord {
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string;
  featuredImage: string | null;
  gallery: string[];
  /** Minor units are not used; store the display price. */
  price: number | null;
  /** Optional strike-through price for promotions. */
  compareAtPrice: number | null;
  currency: string;
  priceNote: string | null;
  /** Nights/days as integers so tours can be filtered and sorted by length. */
  durationDays: number | null;
  durationNights: number | null;
  difficulty: TourDifficulty | null;
  groupSizeMin: number | null;
  groupSizeMax: number | null;
  maxAltitude: number | null;
  destinationId: ID | null;
  activityIds: ID[];
  itinerary: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
  faqs: TourFaq[];
  bestSeason: string[];
  featured: boolean;
  order: number;
  seo: SeoMeta;
}

/* ---------------------------------------------------------- testimonials */

export interface Testimonial extends ContentRecord {
  name: string;
  image: string | null;
  /** 1-5. */
  rating: number;
  message: string;
  position: string | null;
  company: string | null;
  country: string | null;
  /** Optional link back to the tour the review is about. */
  tourId: ID | null;
  featured: boolean;
  order: number;
}

/* ------------------------------------------------------------------ faqs */

export interface Faq extends ContentRecord {
  question: string;
  answer: string;
  category: string | null;
  order: number;
}

/* -------------------------------------------------------------- bookings */

export const ENQUIRY_STATUSES = [
  "new",
  "contacted",
  "quoted",
  "converted",
  "closed",
  "spam",
] as const;

export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export interface Enquiry extends BaseRecord {
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  message: string;
  /** Which tour/destination the enquiry came from, when known. */
  subjectType: string | null;
  subjectId: ID | null;
  travelDate: string | null;
  travellers: number | null;
  status: EnquiryStatus;
  /** Internal notes, never exposed publicly. */
  notes: string | null;
  source: string | null;
}
