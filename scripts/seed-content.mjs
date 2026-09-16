/**
 * The demo site's words: a fictional Nepal trekking operator with a complete
 * set of regions, destinations, activities, trips, posts, pages and reviews.
 *
 * Separated from the runner so a new client project can rewrite the story
 * without touching the file-writing logic, and separated from the photographs
 * so the picture library can be swapped without reading a thousand lines of
 * itinerary. Nothing here is imported by the app — it is development data,
 * loaded only by `npm run cms:seed`.
 *
 * Prose is written as Markdown rather than as a serialised editor document.
 * Both are valid in a rich text field (`lib/rich-text.ts` reads either), and
 * Markdown is the one a human can edit in this file. Opening a record in the
 * admin converts it to the editor's own format on the first save.
 */

/* ----------------------------------------------------------------- helpers */

const EMPTY_SEO = {
  title: null,
  description: null,
  canonical: null,
  robots: "index",
  noFollow: false,
  ogTitle: null,
  ogDescription: null,
  ogImage: null,
  twitterCard: "summary_large_image",
  structuredData: null,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Words per minute used for a post's reading time. Matches the repository. */
const READING_SPEED = 200;

export function buildContent({ media, author, stableId }) {
  const start = Date.now();
  const daysAgo = (days) => new Date(start - days * DAY_MS).toISOString();

  /** A media URL by manifest name, loud rather than silent when it is absent. */
  const img = (name) => {
    const item = media.get(name);
    if (!item) {
      throw new Error(
        `Content refers to the photograph "${name}", which is not in ` +
          "scripts/seed-images.mjs.",
      );
    }
    return item.url;
  };

  const idFor = (collection, slug) => stableId(`${collection}:${slug}`);

  const seo = (overrides = {}) => ({ ...EMPTY_SEO, ...overrides });

  /**
   * The lifecycle fields every published record carries.
   *
   * `createdAt` is pushed further back than `publishedAt` so the admin's
   * "created / updated / published" columns tell a plausible story rather than
   * showing three identical timestamps.
   */
  const record = (collection, slug, publishedDaysAgo) => ({
    id: idFor(collection, slug),
    status: "published",
    publishedAt: daysAgo(publishedDaysAgo),
    updatedBy: author.id,
    createdAt: daysAgo(publishedDaysAgo + 11),
    updatedAt: daysAgo(Math.max(0, publishedDaysAgo - 2)),
  });

  const readingMinutes = (markdown) =>
    Math.max(1, Math.round(markdown.trim().split(/\s+/).length / READING_SPEED));

  /* --------------------------------------------------------------- regions */

  const regions = [
    {
      ...record("regions", "everest", 240),
      name: "Everest",
      slug: "everest",
      shortDescription:
        "The Khumbu: Sherpa villages, working monasteries and eight of the highest mountains on earth.",
      description: `The Khumbu is the valley most people picture when they picture Nepal. It rises from the Dudh Koshi river at around 2,800 metres to the south face of Everest itself, and almost everyone who walks it arrives the same way — on a sixteen-minute flight into Lukla, then north on foot.

## What the walking is like

Trails here are old trade routes, not wilderness paths. They are wide, well graded and busy with porters and yak trains carrying everything the valley eats. You sleep in lodges, eat cooked food and never carry more than a day pack if you do not want to.

What makes the Khumbu hard is not the terrain. It is the altitude. Namche sits at 3,440 metres, and by Gorak Shep you are above 5,100. Every itinerary we run here builds in two acclimatisation days, and we would rather turn a group around than push it.

## The Sherpa valley

Khumbu is Sherpa country, and it has been Buddhist for four centuries. Tengboche is the largest monastery in the region and still a working one; if you are there in October or November you may walk into the middle of Mani Rimdu. Treat the mani walls and chortens as you would any place of worship — pass them on the left.`,
      featuredImage: img("ama-dablam"),
      gallery: [
        img("everest-khumbu-glacier"),
        img("namche-bazaar"),
        img("tengboche-monastery"),
        img("yak-caravan"),
        img("gokyo-lake"),
      ],
      country: "Nepal",
      elevationRange: "2,600–5,545 m",
      highlights: [
        "Everest Base Camp and the Khumbu Icefall",
        "Sunrise on Everest from Kala Patthar",
        "Tengboche monastery below Ama Dablam",
        "The turquoise Gokyo lakes and Ngozumpa glacier",
        "Namche Bazaar on Saturday market day",
      ],
      bestSeason: ["March", "April", "May", "October", "November"],
      featured: true,
      order: 0,
      seo: seo({
        description:
          "Trekking in the Everest region of Nepal: routes, altitudes, seasons and what the Khumbu is actually like to walk.",
      }),
    },
    {
      ...record("regions", "annapurna", 232),
      name: "Annapurna",
      slug: "annapurna",
      shortDescription:
        "Rice terraces to glacier in a week: the most varied trekking in Nepal, reached from Pokhara.",
      description: `Annapurna is the region that converts people. You start in subtropical farmland outside Pokhara, walk up through rhododendron forest that turns scarlet in March, and finish on a glacier ringed by peaks over 7,000 metres. Very few places on earth compress that much landscape into a week's walking.

## Two very different routes

The **Sanctuary** trek climbs into a glacial amphitheatre at Annapurna Base Camp, 4,130 metres, enclosed on every side. It is the shorter and more dramatic of the two, and it can be walked in ten days.

The **Circuit** goes the long way round the massif and crosses the Thorong La at 5,416 metres — a serious pass, and the reason the Circuit needs more acclimatisation than its gentle first week suggests.

## Getting there

Everything starts in Pokhara, a lakeside town 200 kilometres west of Kathmandu, twenty-five minutes by air or six hours by road. It is a good place to lose a day at either end of a trek, and most people do.`,
      featuredImage: img("machhapuchhre"),
      gallery: [
        img("annapurna-base-camp"),
        img("rhododendron-forest"),
        img("thorong-la"),
        img("phewa-lake-sunset"),
      ],
      country: "Nepal",
      elevationRange: "800–5,416 m",
      highlights: [
        "The glacial amphitheatre of Annapurna Base Camp",
        "Machhapuchhre, never climbed and never to be",
        "Crossing the Thorong La at 5,416 m",
        "Rhododendron forest in full flower in March",
        "Hot springs at Jhinu Danda on the walk out",
      ],
      bestSeason: ["March", "April", "May", "October", "November", "December"],
      featured: true,
      order: 1,
      seo: seo({
        description:
          "The Annapurna region: Base Camp, the Circuit and the Thorong La, with seasons, altitudes and how to reach the trailheads from Pokhara.",
      }),
    },
    {
      ...record("regions", "langtang", 198),
      name: "Langtang",
      slug: "langtang",
      shortDescription:
        "The closest big mountains to Kathmandu, and the quietest trails of the three main regions.",
      description: `Langtang is seven hours by road from Kathmandu and no flight is involved, which makes it the region to choose when you have nine days rather than sixteen. It is also the least crowded of Nepal's three main trekking areas — on the walk up through the gorge you will pass more langur monkeys than people.

## After 2015

The earthquake of April 2015 buried Langtang village under a landslide and killed most of the people in it. The village has been rebuilt slightly to the east, the trail is fully open, and the lodges are run by families who came back. Trekking here is the main livelihood in the valley, and going is the most useful thing a visitor can do.

## The walking

Three days up a steep forested gorge, then the valley opens out at Kyanjin Gompa, 3,870 metres, below a wall of ice. Most people spend a day there climbing Kyanjin Ri or Tserko Ri for the view down the whole valley, and buying yak cheese from the small factory the Swiss set up in the 1950s.`,
      featuredImage: img("kyanjin-gompa"),
      gallery: [img("gangchempo"), img("kyanjin-snowfall")],
      country: "Nepal",
      elevationRange: "1,460–4,984 m",
      highlights: [
        "No flight needed — a road head seven hours from Kathmandu",
        "Kyanjin Gompa below Langtang Lirung",
        "The climb up Tserko Ri, 4,984 m",
        "Yak cheese from the valley's own factory",
        "Quiet trails, even in high season",
      ],
      bestSeason: ["March", "April", "May", "October", "November"],
      featured: false,
      order: 2,
      seo: seo({
        description:
          "Trekking the Langtang valley: a short, quiet Himalayan trek reached by road from Kathmandu, with no domestic flight.",
      }),
    },
    {
      ...record("regions", "mustang", 176),
      name: "Mustang",
      slug: "mustang",
      shortDescription:
        "A Tibetan kingdom in the rain shadow of the Annapurnas — red cliffs, walled towns and almost no rain.",
      description: `Mustang sits north of the Himalaya, not south of it, and that one fact explains everything about the place. The Annapurna and Dhaulagiri massifs take the monsoon out of the air before it arrives, so Mustang is a high desert of eroded red and ochre cliffs where the Kali Gandaki has cut the deepest gorge on earth.

## Upper Mustang

North of Kagbeni the district becomes restricted, and you need a special permit, a licensed guide and a minimum of two trekkers. Behind that line is Lo, a Tibetan Buddhist kingdom that was closed to outsiders until 1992 and whose capital, Lo Manthang, is still a walled town of whitewashed houses around three fifteenth-century monasteries.

## When to go

The one region in Nepal you can trek through the monsoon. June to August is dry here and every other trail in the country is wet — it is the obvious answer to "where can I walk in July?"`,
      featuredImage: img("lo-manthang"),
      gallery: [img("mustang-trail"), img("muktinath-valley")],
      country: "Nepal",
      elevationRange: "2,700–4,000 m",
      highlights: [
        "The walled city of Lo Manthang",
        "Fifteenth-century monasteries at Thubchen and Jampa",
        "Cave dwellings cut into the cliffs at Drakmar",
        "Trekkable right through the monsoon",
        "The Kali Gandaki gorge, the deepest on earth",
      ],
      bestSeason: ["May", "June", "July", "August", "September", "October"],
      featured: true,
      order: 3,
      seo: seo({
        description:
          "Upper Mustang: permits, seasons and the walk to Lo Manthang through Nepal's Tibetan high desert.",
      }),
    },
  ];

  /* ---------------------------------------------------------- destinations */

  const destinations = [
    {
      ...record("destinations", "everest-base-camp", 238),
      name: "Everest Base Camp",
      slug: "everest-base-camp",
      shortDescription:
        "The classic walk to the foot of the highest mountain on earth, through the heart of Sherpa country.",
      description: `Base Camp itself is a field of coloured tents on grey moraine at 5,364 metres, at the mouth of the Khumbu Icefall. It is not the prettiest place on the trek and almost nobody comes for the view from it — you come for the fortnight of walking that gets you there, and for the dawn from Kala Patthar the next morning, which is the finest view of Everest that does not require a rope.

## The route

North from Lukla along the Dudh Koshi, over a string of suspension bridges to Namche Bazaar. Then east past Tengboche monastery to Dingboche, and up the Khumbu valley to Lobuche and Gorak Shep. Twelve days of walking, two of them spent going nowhere so your body can catch up.

## Who it suits

Anyone who can walk six hours a day, several days running, and is content to do it slowly. No technical skill is required and no previous trekking experience is assumed. What it does require is patience with the altitude schedule — the people who have trouble here are almost always the fit ones who wanted to go faster.`,
      featuredImage: img("ama-dablam"),
      gallery: [
        img("everest-base-camp"),
        img("everest-khumbu-glacier"),
        img("khumbu-trail"),
        img("kala-patthar"),
        img("tengboche-monastery"),
      ],
      country: "Nepal",
      region: "Khumbu",
      latitude: 27.9881,
      longitude: 86.925,
      highlights: [
        "Standing at the foot of the Khumbu Icefall",
        "Sunrise over Everest from Kala Patthar, 5,545 m",
        "Ama Dablam from the trail above Pangboche",
        "Tengboche monastery at morning prayers",
        "Saturday market in Namche Bazaar",
      ],
      bestSeason: ["March", "April", "May", "October", "November"],
      typicalDuration: "12–14 days",
      featured: true,
      order: 0,
      seo: seo({
        description:
          "The Everest Base Camp trek: route, altitudes, best seasons and what fourteen days in the Khumbu actually involve.",
      }),
    },
    {
      ...record("destinations", "annapurna-sanctuary", 230),
      name: "Annapurna Sanctuary",
      slug: "annapurna-sanctuary",
      shortDescription:
        "A glacial amphitheatre ringed by peaks over 7,000 metres, reached in a week from Pokhara.",
      description: `The Sanctuary is a basin at 4,130 metres enclosed almost completely by mountains — Annapurna South, Hiunchuli, Machhapuchhre and the Annapurna massif itself stand around it in a near-circle. The only way in is a narrow gorge between Hiunchuli and Machhapuchhre, and walking through it into the open bowl is one of the great arrivals in trekking.

## Getting in

From Pokhara it is a short drive to the trailhead and then five days of climbing: terraced farmland, then rhododendron forest, then bamboo, then bare moraine. You gain over 3,000 metres, which is why the itinerary breaks the last section into two short days.

## Timing

March and April for rhododendron in flower; October and November for the clearest air of the year. Avoid the Sanctuary in mid-winter — the gorge is avalanche-prone after heavy snow.`,
      featuredImage: img("machhapuchhre"),
      gallery: [
        img("annapurna-base-camp"),
        img("annapurna-base-camp-snow"),
        img("rhododendron-forest"),
      ],
      country: "Nepal",
      region: "Annapurna",
      latitude: 28.5308,
      longitude: 83.8781,
      highlights: [
        "Sunrise inside the Annapurna Sanctuary",
        "Machhapuchhre from 4,130 m",
        "Rhododendron forest between Ghandruk and Chhomrong",
        "Hot springs at Jhinu Danda on the way out",
      ],
      bestSeason: ["March", "April", "May", "October", "November"],
      typicalDuration: "10–12 days",
      featured: true,
      order: 1,
      seo: seo({
        description:
          "The Annapurna Sanctuary and Annapurna Base Camp: route from Pokhara, altitudes, seasons and when to avoid it.",
      }),
    },
    {
      ...record("destinations", "langtang-valley", 196),
      name: "Langtang Valley",
      slug: "langtang-valley",
      shortDescription:
        "Big mountains without a domestic flight — a nine-day valley walk that starts on a road out of Kathmandu.",
      description: `Langtang is the shortest route from Kathmandu to serious altitude. Seven hours of driving north to Syabrubesi, then three days up a forested gorge, and the valley opens out at Kyanjin Gompa beneath a 7,000-metre wall of ice.

Because there is no flight, there is nothing to be weathered out of — the trek that is easiest to fit into a two-week holiday with a fixed flight home.

## The upper valley

Kyanjin Gompa is where the trek earns its reputation. Two day-walks go up from it: Kyanjin Ri at 4,770 metres for a short, steep morning, and Tserko Ri at 4,984 metres for a long one. Both look straight down the length of the valley you have spent three days walking up.`,
      featuredImage: img("kyanjin-gompa"),
      gallery: [img("gangchempo"), img("kyanjin-snowfall")],
      country: "Nepal",
      region: "Langtang",
      latitude: 28.2131,
      longitude: 85.5203,
      highlights: [
        "No domestic flight and no risk of being weathered in",
        "Kyanjin Gompa beneath Langtang Lirung",
        "Tserko Ri, 4,984 m, in a single morning",
        "Langur monkeys in the gorge below Lama Hotel",
      ],
      bestSeason: ["March", "April", "May", "October", "November"],
      typicalDuration: "8–10 days",
      featured: false,
      order: 2,
      seo: seo({
        description:
          "Trekking the Langtang valley to Kyanjin Gompa: a nine-day Himalayan trek from Kathmandu with no domestic flight.",
      }),
    },
    {
      ...record("destinations", "upper-mustang", 174),
      name: "Upper Mustang",
      slug: "upper-mustang",
      shortDescription:
        "The restricted Tibetan kingdom of Lo — walled towns, cave monasteries and a desert that never sees the monsoon.",
      description: `North of Kagbeni the Kali Gandaki leaves the Himalaya behind and enters a landscape that belongs to the Tibetan plateau: ochre and grey cliffs, irrigated barley terraces, whitewashed villages under flat roofs stacked with firewood.

## Lo Manthang

The capital is still contained by its original wall. Inside are three monasteries from the fifteenth century — Thubchen, Jampa and Chodey — with murals that have been under restoration for two decades. Most itineraries build in a full day here, and it is the day people remember.

## The permit

Upper Mustang is a restricted area. You need a special permit on top of the ordinary conservation-area one, it must be arranged through a licensed agency, and there is a minimum party size of two trekkers. Budget for it: the special permit alone is the single largest line in the trip cost.`,
      featuredImage: img("lo-manthang"),
      gallery: [img("mustang-trail"), img("muktinath-valley")],
      country: "Nepal",
      region: "Mustang",
      latitude: 29.1833,
      longitude: 83.9667,
      highlights: [
        "Inside the walls of Lo Manthang",
        "Fifteenth-century murals at Thubchen Gompa",
        "Cave dwellings in the red cliffs at Drakmar",
        "The pilgrimage temple at Muktinath",
        "Open for trekking right through the monsoon",
      ],
      bestSeason: ["May", "June", "July", "August", "September", "October"],
      typicalDuration: "12–16 days",
      featured: true,
      order: 3,
      seo: seo({
        description:
          "Trekking to Lo Manthang in Upper Mustang: permits, minimum party size, seasons and the route from Jomsom.",
      }),
    },
    {
      ...record("destinations", "kathmandu-valley", 220),
      name: "Kathmandu Valley",
      slug: "kathmandu-valley",
      shortDescription:
        "Seven UNESCO monument zones inside twenty kilometres — the densest concentration of heritage in the Himalaya.",
      description: `Almost every trip to Nepal begins and ends here, and the valley repays the days at either end. Three cities — Kathmandu, Patan and Bhaktapur — were separate kingdoms until the eighteenth century and each kept its own durbar square, its own palace and its own generation of Newar architecture.

## What to see first

**Boudhanath** is the largest stupa in Nepal and the centre of Tibetan life in the valley; go at dusk, when the kora fills with people walking clockwise. **Swayambhunath** sits on a hill over the western city with the best view of it. **Patan Durbar Square** is the most concentrated of the three squares and the easiest to spend an afternoon in.

## Getting around

Traffic is slow and the air in spring is poor. Plan two sights a day, not five, and walk the last stretch wherever you can.`,
      featuredImage: img("boudhanath-stupa"),
      gallery: [img("kathmandu-durbar-square"), img("namche-mural")],
      country: "Nepal",
      region: "Bagmati",
      latitude: 27.7172,
      longitude: 85.324,
      highlights: [
        "Boudhanath stupa at dusk",
        "Kathmandu Durbar Square and the Kumari Ghar",
        "Patan Durbar Square and its museum",
        "Swayambhunath above the western city",
      ],
      bestSeason: [
        "February",
        "March",
        "April",
        "October",
        "November",
        "December",
      ],
      typicalDuration: "2–4 days",
      featured: false,
      order: 4,
      seo: seo({
        description:
          "What to see in the Kathmandu valley: Boudhanath, Swayambhunath and the three durbar squares, and how long to allow.",
      }),
    },
    {
      ...record("destinations", "pokhara", 214),
      name: "Pokhara",
      slug: "pokhara",
      shortDescription:
        "A lakeside town under the Annapurnas, and the start of every trek in western Nepal.",
      description: `Pokhara is where trekkers land before an Annapurna trip and where they collapse afterwards. It sits at 820 metres on the shore of Phewa Lake, and on a clear morning Machhapuchhre stands over it at close to 7,000 metres — one of the shortest horizontal distances from lake to high peak anywhere in the world.

## Worth a day at each end

Walk or taxi up to **Sarangkot** before dawn for the standard Annapurna sunrise. Row across **Phewa Lake** to the Tal Barahi temple on its island. Or do nothing at all on the Lakeside strip, which is what most people do after two weeks of teahouse food.

## Getting there

Twenty-five minutes by air from Kathmandu, or six to seven hours by road along the Trishuli — the same river the rafting trips run.`,
      featuredImage: img("phewa-lake"),
      gallery: [img("phewa-lake-sunset"), img("machhapuchhre")],
      country: "Nepal",
      region: "Gandaki",
      latitude: 28.2096,
      longitude: 83.9856,
      highlights: [
        "Machhapuchhre reflected in Phewa Lake at dawn",
        "Sunrise over the Annapurnas from Sarangkot",
        "The Tal Barahi temple on its island",
        "Paragliding off Sarangkot",
      ],
      bestSeason: [
        "January",
        "February",
        "March",
        "April",
        "October",
        "November",
        "December",
      ],
      typicalDuration: "2–3 days",
      featured: false,
      order: 5,
      seo: seo({
        description:
          "Pokhara, Nepal: Phewa Lake, Sarangkot sunrise and the gateway to every Annapurna trek.",
      }),
    },
  ];

  /* ------------------------------------------------------------ activities */

  const activities = [
    {
      ...record("activities", "teahouse-trekking", 236),
      name: "Teahouse Trekking",
      slug: "teahouse-trekking",
      description:
        "Days on foot between village lodges, with a guide and a porter. No tent, no stove, no food to carry — the reason trekking in Nepal is accessible to people who would never carry a full pack.",
      icon: "mountain-snow",
      featuredImage: img("khumbu-trail"),
      order: 0,
      seo: seo(),
    },
    {
      ...record("activities", "peak-climbing", 228),
      name: "Peak Climbing",
      slug: "peak-climbing",
      description:
        "Nepal's trekking peaks — Island Peak, Mera, Lobuche East — take you onto a rope, crampons and glacier for the first time, with an IFMGA-qualified climbing guide and a week of acclimatisation behind you.",
      icon: "mountain",
      featuredImage: img("imja-tse"),
      order: 1,
      seo: seo(),
    },
    {
      ...record("activities", "cultural-tours", 222),
      name: "Cultural Tours",
      slug: "cultural-tours",
      description:
        "Guided days through the Kathmandu valley's seven UNESCO monument zones, the Newar towns of Patan and Bhaktapur, and the Tibetan quarter around Boudhanath.",
      icon: "landmark",
      featuredImage: img("boudhanath-stupa"),
      order: 2,
      seo: seo(),
    },
    {
      ...record("activities", "jungle-safari", 210),
      name: "Jungle Safari",
      slug: "jungle-safari",
      description:
        "Chitwan and Bardia in the lowland Terai: greater one-horned rhinoceros, gaur, sloth bear and — with patience and luck — a Bengal tiger, on foot, by jeep and by canoe.",
      icon: "trees",
      featuredImage: img("chitwan-rhino"),
      order: 3,
      seo: seo(),
    },
    {
      ...record("activities", "white-water-rafting", 204),
      name: "White-Water Rafting",
      slug: "white-water-rafting",
      description:
        "One day on the Trishuli on the drive between Kathmandu and Pokhara, or a multi-day descent of the Kali Gandaki or Sun Koshi camping on river beaches.",
      icon: "waves",
      featuredImage: img("trishuli-rafting"),
      order: 4,
      seo: seo(),
    },
    {
      ...record("activities", "mountain-flights", 190),
      name: "Mountain Flights",
      slug: "mountain-flights",
      description:
        "An hour out of Kathmandu along the spine of the Himalaya, turning back at Everest. Every seat is a window seat, and it is the one way to see the range if you are not walking.",
      icon: "plane",
      featuredImage: img("lukla-airport"),
      order: 5,
      seo: seo(),
    },
  ];

  /* ----------------------------------------------------------------- tours */

  /**
   * Reads the accommodation vocabulary out of the property name.
   *
   * The itineraries below name where you sleep in prose — "Teahouse in
   * Phakding" — because that is how an operator writes it. Rather than
   * restating the type on seventy entries by hand, it is derived from the
   * words already there, which doubles as a fair test of the field: if the
   * guess is wrong, the demo shows it.
   */
  const accommodationTypeFor = (name) => {
    if (!name) return null;
    const text = name.toLowerCase();
    if (text.includes("teahouse") || text.includes("tea house")) return "tea-house";
    if (text.includes("guesthouse") || text.includes("guest house")) return "guest-house";
    if (text.includes("camp")) return "camping";
    if (text.includes("lodge")) return "lodge";
    if (text.includes("resort")) return "resort";
    if (text.includes("homestay")) return "homestay";
    if (text.includes("hotel")) return "hotel";
    return null;
  };

  /** Itinerary rows need stable ids of their own so the editor can reorder. */
  const days = (slug, rows) => {
    let cursor = 1;

    return rows.map((row, index) => {
      const span = row.spanDays ?? 1;
      const day = cursor;
      cursor += span;

      const type = row.accommodationType ?? accommodationTypeFor(row.accommodation);

      return {
        id: stableId(`itinerary:${slug}:${index + 1}`),
        day,
        spanDays: span,
        title: row.title,
        description: row.description,
        accommodation: row.accommodation ?? null,
        accommodationType: type,
        // Only hotels and resorts carry stars; the schema drops a rating
        // anywhere else, so seeding one would seed a value that cannot survive.
        accommodationRating:
          type === "hotel" || type === "resort" ? (row.accommodationRating ?? 3) : null,
        meals: row.meals ?? [],
        activities: row.activities ?? [],
        images: row.images ?? [],
        altitude: row.altitude ?? null,
        duration: row.duration ?? null,
      };
    });
  };

  /**
   * Per-person rates by party size.
   *
   * Written as [min, max, price] triples because a rate table is read as a
   * table; `max: null` is the open-ended band and has to come last, which is
   * what the schema enforces.
   */
  const groupRates = (slug, rows) =>
    rows.map(([minPeople, maxPeople, price], index) => ({
      id: stableId(`group-rate:${slug}:${index + 1}`),
      minPeople,
      maxPeople,
      price,
    }));

  const tourFaqs = (slug, rows) =>
    rows.map((row, index) => ({
      id: stableId(`tour-faq:${slug}:${index + 1}`),
      question: row.question,
      answer: row.answer,
    }));

  const FULL_BOARD = ["Breakfast", "Lunch", "Dinner"];

  const tours = [
    {
      ...record("tours", "everest-base-camp-trek", 234),
      name: "Everest Base Camp Trek",
      slug: "everest-base-camp-trek",
      shortDescription:
        "Fourteen days to the foot of Everest through Namche, Tengboche and the Khumbu valley, with two acclimatisation days built in.",
      description: `The trek that everything else is measured against. Fourteen days, two of them spent deliberately going nowhere, walking from the airstrip at Lukla to Base Camp at 5,364 metres and up Kala Patthar for dawn.

## How we run it

Groups of four to twelve, one guide to every four trekkers, and one porter to every two. We use the twelve-day walking schedule rather than the ten-day one that some operators sell, because the shorter version puts people at Lobuche without a second acclimatisation day and it is the commonest reason a trek fails.

## What it asks of you

Six to seven hours of walking a day on a good trail, at altitude, for eleven days running. No technical skill. No previous trek necessary. A reasonable base of hill-walking fitness and the willingness to walk more slowly than feels natural.`,
      featuredImage: img("everest-base-camp"),
      gallery: [
        img("ama-dablam"),
        img("everest-khumbu-glacier"),
        img("namche-bazaar"),
        img("tengboche-monastery"),
        img("yak-caravan"),
      ],
      price: 1690,
      compareAtPrice: 1890,
      groupPricing: groupRates("everest-base-camp-trek", [
        [1, 1, 2190],
        [2, 2, 1690],
        [3, 4, 1590],
        [5, 8, 1490],
        [9, null, 1390],
      ]),
      currency: "USD",
      priceNote: "Per person, land only. Kathmandu–Lukla flights included.",
      durationDays: 14,
      durationNights: 13,
      difficulty: "challenging",
      groupSizeMin: 2,
      groupSizeMax: 12,
      maxAltitude: 5545,
      destinationId: idFor("destinations", "everest-base-camp"),
      activityIds: [idFor("activities", "teahouse-trekking")],
      itinerary: days("everest-base-camp-trek", [
        {
          title: "Fly to Lukla, trek to Phakding",
          description:
            "An early flight into Tenzing-Hillary Airport, then a gentle first afternoon downhill along the Dudh Koshi. Short on purpose: you have gained 1,400 metres before breakfast.",
          accommodation: "Teahouse in Phakding",
          meals: ["Lunch", "Dinner"],
          altitude: 2610,
          duration: "3–4 hrs",
          images: [img("lukla-airport")],
        },
        {
          title: "Phakding to Namche Bazaar",
          description:
            "Five suspension bridges and then the long climb to Namche, with the first sight of Everest through the trees an hour below the village.",
          accommodation: "Lodge in Namche Bazaar",
          meals: FULL_BOARD,
          altitude: 3440,
          duration: "6 hrs",
          images: [img("namche-bazaar")],
        },
        {
          title: "Acclimatisation day in Namche",
          description:
            "Climb high, sleep low. A morning walk up to the Everest View Hotel at 3,880 metres and back down, then the afternoon in the Sherpa Culture Museum or the Saturday market.",
          accommodation: "Lodge in Namche Bazaar",
          meals: FULL_BOARD,
          altitude: 3880,
          duration: "4 hrs",
        },
        {
          title: "Namche to Tengboche",
          description:
            "The balcony trail to Kyangjuma with Ama Dablam ahead the whole way, then down to the river at Phunki Tenga and up through rhododendron to the monastery.",
          accommodation: "Lodge in Tengboche",
          meals: FULL_BOARD,
          altitude: 3860,
          duration: "5–6 hrs",
          images: [img("tengboche-monastery")],
        },
        {
          title: "Tengboche to Dingboche",
          description:
            "Past the mani walls at Pangboche and above the treeline into the Imja valley. The landscape stops being green today.",
          accommodation: "Lodge in Dingboche",
          meals: FULL_BOARD,
          altitude: 4410,
          duration: "5 hrs",
        },
        {
          title: "Acclimatisation day in Dingboche",
          description:
            "Up Nangkartshang ridge to around 5,080 metres for Makalu and Lhotse, then back down for a long lunch. The second and last built-in rest day.",
          accommodation: "Lodge in Dingboche",
          meals: FULL_BOARD,
          altitude: 5083,
          duration: "4 hrs",
        },
        {
          title: "Dingboche to Lobuche",
          description:
            "A steady climb to Thukla and then the memorial ridge, where cairns stand for climbers lost on Everest. A sobering hour, and then the Khumbu glacier moraine.",
          accommodation: "Lodge in Lobuche",
          meals: FULL_BOARD,
          altitude: 4940,
          duration: "5 hrs",
        },
        {
          title: "Lobuche to Gorak Shep and Everest Base Camp",
          description:
            "The long day. Up the moraine to Gorak Shep, lunch, then out along the glacier to Base Camp at the foot of the icefall and back to Gorak Shep to sleep.",
          accommodation: "Lodge in Gorak Shep",
          meals: FULL_BOARD,
          altitude: 5364,
          duration: "7–8 hrs",
          images: [img("everest-base-camp")],
        },
        {
          title: "Kala Patthar at dawn, descend to Pheriche",
          description:
            "Out in the dark for the 5,545-metre summit and the best view of Everest on the trek, then a long descent to thicker air at Pheriche.",
          accommodation: "Lodge in Pheriche",
          meals: FULL_BOARD,
          altitude: 5545,
          duration: "7 hrs",
          images: [img("everest-khumbu-glacier"), img("kala-patthar")],
        },
        {
          title: "Pheriche to Namche Bazaar",
          description:
            "Back down through Pangboche and Tengboche. Everything is easier today — you will notice how much oxygen there is at 3,400 metres.",
          accommodation: "Lodge in Namche Bazaar",
          meals: FULL_BOARD,
          altitude: 3440,
          duration: "6–7 hrs",
        },
        {
          title: "Namche to Lukla",
          description:
            "The last long walking day, retracing the Dudh Koshi and its bridges. Traditionally the evening the crew celebrates.",
          accommodation: "Lodge in Lukla",
          meals: FULL_BOARD,
          altitude: 2840,
          duration: "7 hrs",
        },
        {
          title: "Fly Lukla to Kathmandu",
          description:
            "Morning flight out, weather permitting. Afternoon free — most people spend it in a hot shower and then in Thamel.",
          accommodation: "Hotel in Kathmandu",
          meals: ["Breakfast"],
          altitude: 1400,
          duration: "35 min flight",
        },
        {
          title: "Contingency day in Kathmandu",
          description:
            "Held in reserve against a weathered-out Lukla flight, which is common enough that a trek without this day is a trek that risks your international flight. If it is not needed, it is a guided day in the valley.",
          accommodation: "Hotel Shanker",
          accommodationRating: 4,
          meals: ["Breakfast"],
          altitude: 1400,
        },
        {
          title: "Departure",
          description: "Transfer to the airport three hours before your flight.",
          meals: ["Breakfast"],
          altitude: 1400,
        },
      ]),
      inclusions: [
        "All airport and domestic transfers",
        "Return Kathmandu–Lukla flights including baggage allowance",
        "Twelve nights teahouse accommodation on the trek",
        "All meals while trekking, and breakfast in Kathmandu",
        "English-speaking government-licensed guide",
        "One porter between two trekkers (maximum 20 kg)",
        "Sagarmatha National Park fee and Khumbu municipality permit",
        "Guide and porter insurance, wages and equipment",
        "Duffel bag, sleeping bag and down jacket on loan",
        "Pulse oximeter carried daily and a comprehensive first aid kit",
      ],
      exclusions: [
        "International flights and Nepal visa",
        "Travel insurance including helicopter evacuation above 5,500 m",
        "Lunch and dinner in Kathmandu",
        "Hot showers, charging and Wi-Fi in teahouses",
        "Bottled and boiled drinking water",
        "Tips for the guide and porters",
        "Anything of a personal nature",
      ],
      highlights: [
        "Everest Base Camp at 5,364 m, below the Khumbu Icefall",
        "Sunrise on Everest from Kala Patthar, 5,545 m",
        "Two full acclimatisation days, at Namche and Dingboche",
        "Morning prayers at Tengboche monastery",
        "A contingency day in Kathmandu against Lukla weather",
      ],
      faqs: tourFaqs("everest-base-camp-trek", [
        {
          question: "Do I need previous trekking experience?",
          answer:
            "No. You should be comfortable walking six to seven hours a day on consecutive days, and you should have done some hill walking before, but no technical skill or previous altitude experience is assumed.",
        },
        {
          question: "How likely is altitude sickness?",
          answer:
            "Mild symptoms — headache, poor sleep, no appetite — are common and normal above 4,000 metres. Serious altitude sickness is rare on this schedule because of the two acclimatisation days. Your guide checks oxygen saturation daily and the rule is absolute: if you need to descend, you descend.",
        },
        {
          question: "What happens if the Lukla flight is cancelled?",
          answer:
            "It happens, mostly to cloud. Day 13 is held empty for exactly this. If the delay runs longer we will offer a helicopter transfer at cost, which is typically USD 500 per person shared between five.",
        },
        {
          question: "How cold does it get?",
          answer:
            "At Gorak Shep in November, expect −10 °C to −15 °C overnight and around 5 °C in the sun. Lodges are heated in the dining room only. A four-season sleeping bag is essential and we lend one.",
        },
        {
          question: "Is there Wi-Fi and can I charge a phone?",
          answer:
            "Yes, up to Gorak Shep, and both are chargeable — expect USD 2–5 per device or per hour, rising with altitude. Bring a power bank.",
        },
      ]),
      bestSeason: ["March", "April", "May", "October", "November"],
      featured: true,
      order: 0,
      seo: seo({
        description:
          "A 14-day Everest Base Camp trek with two acclimatisation days, licensed guides and a Kathmandu contingency day. From USD 1,690.",
      }),
    },
    {
      ...record("tours", "annapurna-base-camp-trek", 226),
      name: "Annapurna Base Camp Trek",
      slug: "annapurna-base-camp-trek",
      shortDescription:
        "Eleven days from Pokhara into the Annapurna Sanctuary — farmland to glacier, with hot springs on the way out.",
      description: `The most varied week of walking in Nepal. You start among rice terraces at 1,000 metres, climb through rhododendron and bamboo, and finish on moraine at 4,130 metres inside a ring of 7,000-metre peaks with no way out but the way you came in.

## Why eleven days

The Sanctuary can be walked in eight. We take eleven because the final approach gains height quickly and because the two days it buys — one at Deurali, one on the way out at Jhinu — are the difference between a hard trek and a good one.

## Fitness

Less altitude than Everest, more stairs. The stone staircases between Chhomrong and Bamboo are genuinely punishing on the descent, and trekking poles are not optional here.`,
      featuredImage: img("annapurna-base-camp"),
      gallery: [
        img("machhapuchhre"),
        img("annapurna-base-camp-snow"),
        img("rhododendron-forest"),
        img("phewa-lake-sunset"),
      ],
      price: 1190,
      compareAtPrice: null,
      groupPricing: groupRates("annapurna-base-camp-trek", [
        [1, 1, 1590],
        [2, 2, 1190],
        [3, 5, 1120],
        [6, null, 1040],
      ]),
      currency: "USD",
      priceNote: "Per person, land only. Kathmandu–Pokhara by tourist coach.",
      durationDays: 11,
      durationNights: 10,
      difficulty: "moderate",
      groupSizeMin: 2,
      groupSizeMax: 14,
      maxAltitude: 4130,
      destinationId: idFor("destinations", "annapurna-sanctuary"),
      activityIds: [idFor("activities", "teahouse-trekking")],
      itinerary: days("annapurna-base-camp-trek", [
        {
          title: "Kathmandu to Pokhara",
          description:
            "Tourist coach along the Trishuli, or a 25-minute flight for a supplement. Evening free on Lakeside.",
          accommodation: "Hotel in Pokhara",
          meals: ["Breakfast"],
          altitude: 820,
          duration: "6–7 hrs by road",
          images: [img("phewa-lake")],
        },
        {
          title: "Drive to Nayapul, trek to Ghandruk",
          description:
            "An hour and a half to the trailhead, then up through terraced farmland to the large Gurung village of Ghandruk and its first proper view of Annapurna South.",
          accommodation: "Lodge in Ghandruk",
          meals: FULL_BOARD,
          altitude: 1940,
          duration: "5 hrs",
        },
        {
          title: "Ghandruk to Chhomrong",
          description:
            "Down to the Kimrong Khola and back up the other side. Chhomrong is the gateway village to the Sanctuary and the last place with a proper shop.",
          accommodation: "Lodge in Chhomrong",
          meals: FULL_BOARD,
          altitude: 2170,
          duration: "5–6 hrs",
        },
        {
          title: "Chhomrong to Bamboo",
          description:
            "The famous stone staircase down to the Chhomrong Khola, then a long climb through bamboo forest into the gorge proper.",
          accommodation: "Lodge in Bamboo",
          meals: FULL_BOARD,
          altitude: 2310,
          duration: "5 hrs",
        },
        {
          title: "Bamboo to Deurali",
          description:
            "Up through Dovan and the Hinku cave. The gorge narrows and the trees give out; from here it is rock and snow.",
          accommodation: "Lodge in Deurali",
          meals: FULL_BOARD,
          altitude: 3230,
          duration: "5–6 hrs",
        },
        {
          title: "Deurali to Annapurna Base Camp",
          description:
            "Through the gate between Hiunchuli and Machhapuchhre, past Machhapuchhre Base Camp, and out into the Sanctuary. Afternoon free to watch the light move round the rim.",
          accommodation: "Lodge at Annapurna Base Camp",
          meals: FULL_BOARD,
          altitude: 4130,
          duration: "5 hrs",
          images: [img("annapurna-base-camp")],
        },
        {
          title: "Sunrise at the Sanctuary, descend to Bamboo",
          description:
            "Up before dawn for first light on Annapurna I, then the long drop back down the gorge. Most of the descent is done in one day and the knees know it.",
          accommodation: "Lodge in Bamboo",
          meals: FULL_BOARD,
          altitude: 2310,
          duration: "6–7 hrs",
        },
        {
          title: "Bamboo to Jhinu Danda",
          description:
            "Back up over Chhomrong and down to Jhinu. Twenty minutes below the village are natural hot springs on the riverbank, which is the entire point of this day.",
          accommodation: "Lodge in Jhinu Danda",
          meals: FULL_BOARD,
          altitude: 1780,
          duration: "5 hrs",
        },
        {
          title: "Jhinu Danda to Nayapul, drive to Pokhara",
          description:
            "An easy last morning along the Modi Khola, then the drive back. Afternoon on Lakeside.",
          accommodation: "Hotel in Pokhara",
          meals: ["Breakfast", "Lunch"],
          altitude: 820,
          duration: "4 hrs walking",
        },
        {
          title: "Free day in Pokhara",
          description:
            "Sarangkot for sunrise over the range you have just walked in, or a boat across Phewa Lake, or nothing at all.",
          accommodation: "Hotel in Pokhara",
          meals: ["Breakfast"],
          altitude: 820,
          images: [img("phewa-lake-sunset")],
        },
        {
          title: "Return to Kathmandu",
          description:
            "Flight or coach back, and a transfer to your onward connection.",
          meals: ["Breakfast"],
          altitude: 1400,
        },
      ]),
      inclusions: [
        "Kathmandu–Pokhara–Kathmandu by tourist coach",
        "Three nights hotel in Pokhara, bed and breakfast",
        "Seven nights teahouse accommodation on the trek",
        "All meals while trekking",
        "English-speaking government-licensed guide",
        "One porter between two trekkers (maximum 20 kg)",
        "Annapurna Conservation Area permit and trekking registration",
        "All ground transfers to and from the trailhead",
        "Sleeping bag and down jacket on loan",
      ],
      exclusions: [
        "International flights and Nepal visa",
        "Travel insurance including helicopter evacuation",
        "Kathmandu accommodation and meals",
        "Pokhara–Kathmandu flight upgrade (USD 125 each way)",
        "Hot springs entry at Jhinu Danda",
        "Tips for the guide and porters",
      ],
      highlights: [
        "Sunrise inside the Annapurna Sanctuary at 4,130 m",
        "Machhapuchhre at close range from Base Camp",
        "Rhododendron forest in flower in March and April",
        "Natural hot springs at Jhinu Danda on the walk out",
        "A free day on Phewa Lake at the end",
      ],
      faqs: tourFaqs("annapurna-base-camp-trek", [
        {
          question: "Is this easier than Everest Base Camp?",
          answer:
            "Lower, shorter and warmer, so altitude is much less of a factor — but the daily ascent and descent is greater and the stone staircases are hard on knees. Most people find the walking itself harder and the trek as a whole easier.",
        },
        {
          question: "Is the Sanctuary safe in winter?",
          answer:
            "The approach gorge is avalanche-prone after heavy snowfall, and we do not run this trek between mid-January and the end of February. October, November, March and April are the reliable months.",
        },
        {
          question: "Can I do this without a porter?",
          answer:
            "You can, and we will reduce the price accordingly. We would still send a guide: the Nepal Tourism Board has required licensed guides for trekkers in conservation areas since 2023.",
        },
      ]),
      bestSeason: ["March", "April", "May", "October", "November"],
      featured: true,
      order: 1,
      seo: seo({
        description:
          "An 11-day Annapurna Base Camp trek from Pokhara into the Sanctuary, with hot springs and a free lake day. From USD 1,190.",
      }),
    },
    {
      ...record("tours", "langtang-valley-trek", 194),
      name: "Langtang Valley Trek",
      slug: "langtang-valley-trek",
      shortDescription:
        "Nine days to Kyanjin Gompa and back, entirely by road from Kathmandu — no domestic flight to be weathered out of.",
      description: `The short Himalayan trek. Nine days door to door, no internal flight, and by day four you are at 3,870 metres beneath a wall of ice with 5,000-metre viewpoints on either side.

## Going back to Langtang

The 2015 earthquake destroyed Langtang village and killed most of the people in it. The valley has been rebuilt and the lodges are run by families who chose to return to a place that has one industry. This is the trek we recommend to people who ask which of ours does the most good.

## Practicalities

The drive to Syabrubesi is seven hours on a rough road and it is the least pleasant part of the trip. Everything after it is straightforward.`,
      featuredImage: img("kyanjin-gompa"),
      gallery: [img("gangchempo"), img("kyanjin-snowfall")],
      price: 950,
      compareAtPrice: 1090,
      groupPricing: groupRates("langtang-valley-trek", [
        [1, 1, 1290],
        [2, 2, 950],
        [3, 6, 890],
        [7, null, 830],
      ]),
      currency: "USD",
      priceNote: "Per person, land only. No domestic flights required.",
      durationDays: 9,
      durationNights: 8,
      difficulty: "moderate",
      groupSizeMin: 2,
      groupSizeMax: 12,
      maxAltitude: 4984,
      destinationId: idFor("destinations", "langtang-valley"),
      activityIds: [idFor("activities", "teahouse-trekking")],
      itinerary: days("langtang-valley-trek", [
        {
          title: "Kathmandu to Syabrubesi",
          description:
            "A long drive north through Trisuli Bazaar and Dhunche, climbing to the Langtang road head. Rough in places and worth the window seat.",
          accommodation: "Lodge in Syabrubesi",
          meals: ["Lunch", "Dinner"],
          altitude: 1460,
          duration: "7 hrs by road",
        },
        {
          title: "Syabrubesi to Lama Hotel",
          description:
            "Into the gorge along the Langtang Khola, climbing through oak and then hemlock. Langur monkeys most of the way.",
          accommodation: "Lodge at Lama Hotel",
          meals: FULL_BOARD,
          altitude: 2470,
          duration: "6 hrs",
        },
        {
          title: "Lama Hotel to Langtang village",
          description:
            "The valley opens and the peaks appear. You pass the landslide scar above the old village site, where a memorial now stands.",
          accommodation: "Lodge in Langtang village",
          meals: FULL_BOARD,
          altitude: 3430,
          duration: "5–6 hrs",
        },
        {
          title: "Langtang to Kyanjin Gompa",
          description:
            "A short, beautiful morning past mani walls and yak pasture to the monastery at the head of the valley. Afternoon free to settle in and to visit the cheese factory.",
          accommodation: "Lodge at Kyanjin Gompa",
          meals: FULL_BOARD,
          altitude: 3870,
          duration: "3–4 hrs",
          images: [img("kyanjin-gompa")],
        },
        {
          title: "Tserko Ri, 4,984 m",
          description:
            "The big day. A pre-dawn start and a steep 1,100-metre climb for a view down the entire valley and north into Tibet, then back to the lodge by lunch.",
          accommodation: "Lodge at Kyanjin Gompa",
          meals: FULL_BOARD,
          altitude: 4984,
          duration: "6–7 hrs",
          images: [img("gangchempo")],
        },
        {
          title: "Kyanjin Gompa to Lama Hotel",
          description:
            "Back down the valley, covering two days' ascent in one descent.",
          accommodation: "Lodge at Lama Hotel",
          meals: FULL_BOARD,
          altitude: 2470,
          duration: "6 hrs",
        },
        {
          title: "Lama Hotel to Syabrubesi",
          description:
            "Out through the gorge to the road head. Last night of teahouse food.",
          accommodation: "Lodge in Syabrubesi",
          meals: FULL_BOARD,
          altitude: 1460,
          duration: "5 hrs",
        },
        {
          title: "Drive back to Kathmandu",
          description:
            "The long road south again, arriving in Thamel in the late afternoon.",
          accommodation: "Hotel in Kathmandu",
          meals: ["Breakfast", "Lunch"],
          altitude: 1400,
          duration: "7 hrs by road",
        },
        {
          title: "Departure",
          description: "Transfer to the airport for your onward flight.",
          meals: ["Breakfast"],
          altitude: 1400,
        },
      ]),
      inclusions: [
        "Private vehicle Kathmandu–Syabrubesi–Kathmandu",
        "Seven nights lodge accommodation on the trek",
        "All meals while trekking",
        "English-speaking government-licensed guide",
        "One porter between two trekkers (maximum 20 kg)",
        "Langtang National Park fee and trekking registration",
        "Sleeping bag and down jacket on loan",
      ],
      exclusions: [
        "International flights and Nepal visa",
        "Travel insurance including helicopter evacuation",
        "Kathmandu accommodation and meals",
        "Hot showers and device charging in lodges",
        "Tips for the guide and porters",
      ],
      highlights: [
        "No domestic flight, so nothing to be weathered out of",
        "Kyanjin Gompa at 3,870 m in four walking days",
        "Tserko Ri, 4,984 m, in a single morning",
        "Yak cheese from the valley's own factory",
        "The quietest trails of Nepal's three main regions",
      ],
      faqs: tourFaqs("langtang-valley-trek", [
        {
          question: "Is Langtang safe after the earthquake?",
          answer:
            "Yes. The trail is fully open, the lodges were rebuilt to better standards than the originals, and the valley has been receiving trekkers continuously since 2016. Your guide will point out the memorial above the old village site.",
        },
        {
          question: "Can this be done in fewer days?",
          answer:
            "It can be walked in seven by skipping Tserko Ri and running the descent together, and we will quote for that. We do not recommend it — the acclimatisation day is what makes the high viewpoint possible.",
        },
        {
          question: "How bad is the road?",
          answer:
            "Honestly, it is rough — seven hours, unsealed in stretches, with drops. It is the price of a trek with no flight risk, and most people decide it was worth it on the way back.",
        },
      ]),
      bestSeason: ["March", "April", "May", "October", "November"],
      featured: false,
      order: 2,
      seo: seo({
        description:
          "A 9-day Langtang valley trek to Kyanjin Gompa and Tserko Ri, by road from Kathmandu with no domestic flight. From USD 950.",
      }),
    },
    {
      ...record("tours", "upper-mustang-trek", 172),
      name: "Upper Mustang Trek",
      slug: "upper-mustang-trek",
      shortDescription:
        "Fourteen days into the restricted kingdom of Lo, to the walled capital at Lo Manthang. Trekkable through the monsoon.",
      description: `Behind the Annapurnas, in their rain shadow, is a Tibetan Buddhist kingdom that stayed closed to outsiders until 1992. Upper Mustang is red rock, barley terraces, cave dwellings and a walled capital with three fifteenth-century monasteries in it.

## The permit

Upper Mustang is a restricted area: a special permit is required in addition to the Annapurna conservation permit, it can only be issued through a licensed agency, and there is a minimum of two trekkers in a party. It is the largest single cost in this trip and it is non-refundable once issued.

## Why the monsoon works here

The Himalaya takes the rain out of the air before it gets this far north. June to August is dry, warm and green with barley — the only good trekking in Nepal during the months when everywhere else is under cloud.`,
      featuredImage: img("lo-manthang"),
      gallery: [img("mustang-trail"), img("muktinath-valley")],
      price: 2450,
      compareAtPrice: null,
      groupPricing: groupRates("upper-mustang-trek", [
        [2, 2, 2450],
        [3, 4, 2290],
        [5, null, 2150],
      ]),
      currency: "USD",
      priceNote:
        "Per person, land only. Includes the USD 500 restricted-area permit.",
      durationDays: 14,
      durationNights: 13,
      difficulty: "moderate",
      groupSizeMin: 2,
      groupSizeMax: 10,
      maxAltitude: 4010,
      destinationId: idFor("destinations", "upper-mustang"),
      activityIds: [
        idFor("activities", "teahouse-trekking"),
        idFor("activities", "cultural-tours"),
      ],
      itinerary: days("upper-mustang-trek", [
        {
          title: "Arrive in Kathmandu",
          description:
            "Airport transfer and a permit briefing. We need your passport overnight for the restricted-area application.",
          accommodation: "Hotel in Kathmandu",
          meals: [],
          altitude: 1400,
        },
        {
          title: "Fly to Pokhara",
          description:
            "Twenty-five minutes over the foothills, with the Annapurnas out of the right-hand windows. Afternoon free on Lakeside.",
          accommodation: "Hotel in Pokhara",
          meals: ["Breakfast"],
          altitude: 820,
        },
        {
          title: "Fly to Jomsom, trek to Kagbeni",
          description:
            "An early flight up the Kali Gandaki gorge, then a short walk north to the medieval village of Kagbeni, where the restricted area begins.",
          accommodation: "Lodge in Kagbeni",
          meals: FULL_BOARD,
          altitude: 2810,
          duration: "3 hrs",
        },
        {
          title: "Kagbeni to Chele",
          description:
            "Through the checkpost and into Upper Mustang proper. The colour of the landscape changes within an hour of leaving Kagbeni.",
          accommodation: "Lodge in Chele",
          meals: FULL_BOARD,
          altitude: 3050,
          duration: "5–6 hrs",
          images: [img("mustang-trail")],
        },
        {
          title: "Chele to Syangboche",
          description:
            "Two passes and a long, exposed traverse. The highest day so far and the first that feels genuinely remote.",
          accommodation: "Lodge in Syangboche",
          meals: FULL_BOARD,
          altitude: 3800,
          duration: "6–7 hrs",
        },
        {
          title: "Syangboche to Ghami",
          description:
            "Over the Yamda La and down to Ghami, past the longest mani wall in Nepal.",
          accommodation: "Lodge in Ghami",
          meals: FULL_BOARD,
          altitude: 3520,
          duration: "5 hrs",
        },
        {
          title: "Ghami to Tsarang",
          description:
            "Across the Ghami Khola and up to Tsarang, a large village below a red gompa and the ruins of a five-storey palace.",
          accommodation: "Lodge in Tsarang",
          meals: FULL_BOARD,
          altitude: 3560,
          duration: "5 hrs",
        },
        {
          title: "Tsarang to Lo Manthang",
          description:
            "Over the Lo La and the first sight of the walled city on the plain below. A short descent and you are inside it.",
          accommodation: "Guesthouse in Lo Manthang",
          meals: FULL_BOARD,
          altitude: 3840,
          duration: "5 hrs",
          images: [img("lo-manthang")],
        },
        {
          title: "Lo Manthang",
          description:
            "A full day in the capital: Thubchen and Jampa gompas, the Chodey monastery, the royal palace and the workshops where the murals are being restored.",
          accommodation: "Guesthouse in Lo Manthang",
          meals: FULL_BOARD,
          altitude: 3840,
        },
        {
          title: "Lo Manthang to Drakmar via Ghar Gompa",
          description:
            "West on the high route to Ghar Gompa, the oldest monastery in Mustang, then down to Drakmar under its red cliffs.",
          accommodation: "Lodge in Drakmar",
          meals: FULL_BOARD,
          altitude: 3820,
          duration: "6–7 hrs",
        },
        {
          title: "Drakmar to Syangboche",
          description:
            "South again on the western variant, with views back to the Damodar Himal.",
          accommodation: "Lodge in Syangboche",
          meals: FULL_BOARD,
          altitude: 3800,
          duration: "6 hrs",
        },
        {
          title: "Syangboche to Chuksang",
          description:
            "A long descent back towards the Kali Gandaki and out of the high desert.",
          accommodation: "Lodge in Chuksang",
          meals: FULL_BOARD,
          altitude: 3050,
          duration: "6 hrs",
        },
        {
          title: "Chuksang to Jomsom, fly to Pokhara",
          description:
            "Down the riverbed to Kagbeni and Jomsom, with an optional detour to the pilgrimage temple at Muktinath, then the afternoon flight out.",
          accommodation: "Hotel in Pokhara",
          meals: ["Breakfast", "Lunch"],
          altitude: 820,
          duration: "5 hrs",
          images: [img("muktinath-valley")],
        },
        {
          title: "Fly to Kathmandu",
          description: "Morning flight and a transfer to your onward connection.",
          meals: ["Breakfast"],
          altitude: 1400,
        },
      ]),
      inclusions: [
        "Upper Mustang restricted-area permit (USD 500 per person)",
        "Annapurna Conservation Area permit",
        "Kathmandu–Pokhara–Jomsom flights and returns",
        "Eleven nights lodge and guesthouse accommodation",
        "All meals while trekking",
        "English-speaking government-licensed guide",
        "One porter between two trekkers (maximum 20 kg)",
        "Monastery entry fees in Lo Manthang",
      ],
      exclusions: [
        "International flights and Nepal visa",
        "Travel insurance including helicopter evacuation",
        "Kathmandu accommodation and meals",
        "Extra nights caused by flight delays at Jomsom",
        "Tips for the guide and porters",
      ],
      highlights: [
        "Inside the walls of Lo Manthang",
        "Fifteenth-century murals at Thubchen and Jampa",
        "Ghar Gompa, the oldest monastery in Mustang",
        "Red cliffs and cave dwellings at Drakmar",
        "Dry and green in June, July and August",
      ],
      faqs: tourFaqs("upper-mustang-trek", [
        {
          question: "Can I trek Upper Mustang alone?",
          answer:
            "No. The restricted-area permit requires a minimum of two trekkers and a licensed guide. If you are travelling solo we can pair you with another booking, or issue a permit for two at additional cost.",
        },
        {
          question: "Is it really trekkable in the monsoon?",
          answer:
            "Yes, and it is the main reason to come in summer. Mustang lies in the rain shadow of the Annapurna and Dhaulagiri massifs. Expect wind rather than rain — afternoons in the Kali Gandaki gorge are famously fierce.",
        },
        {
          question: "How high does it get?",
          answer:
            "The highest pass on this route is a little over 4,000 metres and you sleep no higher than 3,840. Altitude is a much smaller factor here than on the Everest or Annapurna treks.",
        },
        {
          question: "What if the Jomsom flight is cancelled?",
          answer:
            "Jomsom flies in the morning only, because of the afternoon wind. Delays are common. There is a long jeep road as a fallback, and we build the schedule so a lost day does not lose you the permit.",
        },
      ]),
      bestSeason: ["May", "June", "July", "August", "September", "October"],
      featured: true,
      order: 3,
      seo: seo({
        description:
          "A 14-day trek to Lo Manthang in Upper Mustang, permit included. Dry through the monsoon. From USD 2,450.",
      }),
    },
    {
      ...record("tours", "island-peak-climb", 168),
      name: "Island Peak Climb",
      slug: "island-peak-climb",
      shortDescription:
        "Sixteen days in the Khumbu ending on the summit of Imja Tse at 6,189 metres — a first Himalayan peak.",
      description: `Island Peak is the mountain most people climb first in Nepal. It is a trekking peak, which means no previous expedition experience is required, but it is emphatically a climb: crampons, a harness, a fixed rope on the headwall and a crevassed glacier to cross before it.

## The shape of the trip

Nine days of acclimatisation on the Everest trail, two days of skills training at Chhukung, then base camp, a summit day that starts at one in the morning, and a spare day in case the weather takes the first attempt.

## What we ask

You should be a competent hill walker, comfortable with exposure, and fit enough for a 1,000-metre ascent starting in the dark at 5,200 metres. We teach everything technical on the mountain — rope work, crampons, jumar — and we run one climbing guide to every two climbers on summit day.`,
      featuredImage: img("imja-tse"),
      gallery: [
        img("imja-tse-camp"),
        img("ama-dablam"),
        img("cho-la-pass"),
        img("everest-khumbu-glacier"),
      ],
      price: 3150,
      compareAtPrice: 3450,
      groupPricing: groupRates("island-peak-climb", [
        [1, 1, 3950],
        [2, 3, 3150],
        [4, null, 2950],
      ]),
      currency: "USD",
      priceNote:
        "Per person, land only. Includes the peak permit and climbing equipment.",
      durationDays: 16,
      durationNights: 15,
      difficulty: "strenuous",
      groupSizeMin: 2,
      groupSizeMax: 8,
      maxAltitude: 6189,
      destinationId: idFor("destinations", "everest-base-camp"),
      activityIds: [
        idFor("activities", "peak-climbing"),
        idFor("activities", "teahouse-trekking"),
      ],
      itinerary: days("island-peak-climb", [
        {
          title: "Arrive in Kathmandu",
          description:
            "Transfer, equipment check and a briefing. Anything missing can be bought or hired in Thamel the same evening.",
          accommodation: "Hotel in Kathmandu",
          meals: [],
          altitude: 1400,
        },
        {
          title: "Fly to Lukla, trek to Phakding",
          description: "The morning flight in, then an easy afternoon downvalley.",
          accommodation: "Teahouse in Phakding",
          meals: ["Lunch", "Dinner"],
          altitude: 2610,
          duration: "3–4 hrs",
          images: [img("lukla-airport")],
        },
        {
          title: "Phakding to Namche Bazaar",
          description: "The bridges and the long climb to Namche.",
          accommodation: "Lodge in Namche Bazaar",
          meals: FULL_BOARD,
          altitude: 3440,
          duration: "6 hrs",
        },
        {
          title: "Acclimatisation day in Namche",
          description:
            "Up to the Everest View Hotel and Khumjung, back down to sleep.",
          accommodation: "Lodge in Namche Bazaar",
          meals: FULL_BOARD,
          altitude: 3880,
          duration: "4 hrs",
        },
        {
          title: "Namche to Tengboche",
          description: "The balcony trail and the climb to the monastery.",
          accommodation: "Lodge in Tengboche",
          meals: FULL_BOARD,
          altitude: 3860,
          duration: "5–6 hrs",
          images: [img("tengboche-monastery")],
        },
        {
          title: "Tengboche to Dingboche",
          description: "Above the treeline and east into the Imja valley.",
          accommodation: "Lodge in Dingboche",
          meals: FULL_BOARD,
          altitude: 4410,
          duration: "5 hrs",
        },
        {
          title: "Acclimatisation day in Dingboche",
          description:
            "Nangkartshang ridge to 5,080 metres — the first time above 5,000 on this trip.",
          accommodation: "Lodge in Dingboche",
          meals: FULL_BOARD,
          altitude: 5083,
          duration: "4 hrs",
        },
        {
          title: "Dingboche to Chhukung",
          description:
            "A short day up the Imja valley with Island Peak ahead and the Lhotse wall on your left.",
          accommodation: "Lodge in Chhukung",
          meals: FULL_BOARD,
          altitude: 4730,
          duration: "3 hrs",
          images: [img("imja-tse")],
        },
        {
          title: "Skills day at Chhukung",
          description:
            "A full day on a practice slope: crampons, ice axe, harness, jumar and abseil. Nobody goes on the mountain without this.",
          accommodation: "Lodge in Chhukung",
          meals: FULL_BOARD,
          altitude: 4730,
          duration: "6 hrs",
        },
        {
          title: "Island Peak base camp, and the summit push",
          description:
            "Three hours up the valley to the camp on the moraine, then an early night. Away at 1 a.m. for the rock gully, the glacier and its crevasse ladders, and the 100-metre fixed-rope headwall to a sharp summit ridge. Two nights are spent at this camp.",
          accommodation: "Tented camp",
          spanDays: 2,
          meals: FULL_BOARD,
          altitude: 6189,
          duration: "3–4 hrs in, then a 12–14 hr summit day",
          images: [img("imja-tse-camp")],
        },
        {
          title: "Reserve day",
          description:
            "Held for a second summit attempt if weather or conditions stopped the first. Unused, it becomes a rest day at Chhukung.",
          accommodation: "Lodge in Chhukung",
          meals: FULL_BOARD,
          altitude: 4730,
        },
        {
          title: "Chhukung to Pangboche",
          description: "Down the valley and back below 4,000 metres.",
          accommodation: "Lodge in Pangboche",
          meals: FULL_BOARD,
          altitude: 3985,
          duration: "5–6 hrs",
        },
        {
          title: "Pangboche to Namche Bazaar",
          description:
            "Past Tengboche and back along the balcony trail, with a last look at Everest from Kyangjuma.",
          accommodation: "Lodge in Namche Bazaar",
          meals: FULL_BOARD,
          altitude: 3440,
          duration: "6 hrs",
        },
        {
          title: "Namche to Lukla",
          description: "The last walking day, and the crew's celebration dinner.",
          accommodation: "Lodge in Lukla",
          meals: FULL_BOARD,
          altitude: 2840,
          duration: "7 hrs",
        },
        {
          title: "Fly to Kathmandu",
          description:
            "Morning flight out and a transfer to your hotel or onward flight.",
          meals: ["Breakfast"],
          altitude: 1400,
        },
      ]),
      inclusions: [
        "Island Peak (Imja Tse) climbing permit and garbage deposit",
        "Sagarmatha National Park and municipality permits",
        "Return Kathmandu–Lukla flights",
        "IFMGA-qualified climbing guide, one to every two climbers on summit day",
        "Two nights tented base camp with cook and kitchen crew",
        "Group climbing equipment: rope, ice screws, snow bar, fixed line",
        "Personal climbing kit on loan: harness, crampons, axe, helmet, jumar",
        "All meals on the trek and at base camp",
        "A reserve summit day",
      ],
      exclusions: [
        "International flights and Nepal visa",
        "Travel insurance with cover for climbing to 6,500 m and helicopter rescue",
        "Kathmandu accommodation and meals",
        "Personal clothing and mountaineering boots",
        "Summit bonus for the climbing guide (customary, USD 200–300)",
        "Tips for the trekking crew",
      ],
      highlights: [
        "A 6,189-metre Himalayan summit with no previous expedition experience",
        "A full skills day before anyone sets foot on the mountain",
        "One climbing guide to every two climbers on summit day",
        "A reserve day built in for a second attempt",
        "Nine days of acclimatisation on the Everest trail first",
      ],
      faqs: tourFaqs("island-peak-climb", [
        {
          question: "Do I need mountaineering experience?",
          answer:
            "No previous Himalayan or alpine experience is required, and most of our climbers have none. You do need to be a strong hill walker, comfortable on steep ground and with exposure. Everything technical is taught on the skills day at Chhukung.",
        },
        {
          question: "What is the summit success rate?",
          answer:
            "Across the last five seasons, 78 per cent of our climbers summited. The two commonest reasons for turning back are weather on both available days and the pace of the headwall queue, not fitness.",
        },
        {
          question: "What boots do I need?",
          answer:
            "A B2 or B3 mountaineering boot rated to −20 °C, which you should own and have walked in before you arrive. Everything else — crampons, harness, axe, helmet, jumar — we provide.",
        },
        {
          question: "What insurance cover do I need?",
          answer:
            "A policy that explicitly covers mountaineering to 6,500 metres and helicopter evacuation. Standard trekking policies usually stop at 6,000 and will not pay. We check the certificate before departure.",
        },
      ]),
      bestSeason: ["April", "May", "October", "November"],
      featured: false,
      order: 4,
      seo: seo({
        description:
          "A 16-day Island Peak (Imja Tse) climb via the Everest trail, with a skills day and a reserve summit day. From USD 3,150.",
      }),
    },
    {
      ...record("tours", "kathmandu-pokhara-chitwan", 206),
      name: "Kathmandu, Pokhara and Chitwan",
      slug: "kathmandu-pokhara-chitwan",
      shortDescription:
        "Eight days of temples, lakes and jungle with no trekking at all — Nepal at low altitude.",
      description: `Not everyone comes to Nepal to walk uphill. This is the classic circuit: the heritage of the Kathmandu valley, a lake under the Annapurnas, and two nights in the lowland jungle looking for rhinoceros.

Nothing here goes above 1,400 metres, nothing involves more than a gentle walk, and it works as well for families and for people with a week as it does for anyone who wants the country without the altitude.`,
      featuredImage: img("boudhanath-stupa"),
      gallery: [
        img("kathmandu-durbar-square"),
        img("phewa-lake"),
        img("chitwan-rhino"),
        img("trishuli-rafting"),
      ],
      price: 890,
      compareAtPrice: null,
      groupPricing: groupRates("kathmandu-pokhara-chitwan", [
        [1, 1, 1290],
        [2, 3, 890],
        [4, 7, 820],
        [8, null, 760],
      ]),
      currency: "USD",
      priceNote: "Per person, twin share, land only. Private vehicle throughout.",
      durationDays: 8,
      durationNights: 7,
      difficulty: "easy",
      groupSizeMin: 2,
      groupSizeMax: 16,
      maxAltitude: 1400,
      destinationId: idFor("destinations", "kathmandu-valley"),
      activityIds: [
        idFor("activities", "cultural-tours"),
        idFor("activities", "jungle-safari"),
        idFor("activities", "white-water-rafting"),
      ],
      itinerary: days("kathmandu-pokhara-chitwan", [
        {
          title: "Arrive in Kathmandu",
          description:
            "Airport transfer and an evening walk through Thamel with your guide to get oriented.",
          accommodation: "Hotel in Kathmandu",
          meals: [],
          altitude: 1400,
        },
        {
          title: "Kathmandu Durbar Square and Swayambhunath",
          description:
            "The old royal square and the Kumari Ghar in the morning; the hilltop stupa above the western city in the afternoon.",
          accommodation: "Hotel in Kathmandu",
          meals: ["Breakfast"],
          altitude: 1400,
          duration: "Full day",
          images: [img("kathmandu-durbar-square")],
        },
        {
          title: "Boudhanath and Patan",
          description:
            "The largest stupa in Nepal and the Tibetan quarter around it, then across the river to Patan Durbar Square and its museum.",
          accommodation: "Hotel in Kathmandu",
          meals: ["Breakfast"],
          altitude: 1400,
          duration: "Full day",
          images: [img("boudhanath-stupa")],
        },
        {
          title: "Drive to Pokhara, rafting the Trishuli",
          description:
            "West along the Trishuli with a half-day on the river — grade II and III, warm water, and no experience needed. On to Pokhara for the evening.",
          accommodation: "Hotel in Pokhara",
          meals: ["Breakfast", "Lunch"],
          altitude: 820,
          duration: "7 hrs including rafting",
          images: [img("trishuli-rafting")],
        },
        {
          title: "Sarangkot sunrise and Phewa Lake",
          description:
            "Up before dawn for the Annapurnas from Sarangkot, back for a late breakfast, then a rowing boat across the lake to the Tal Barahi temple.",
          accommodation: "Hotel in Pokhara",
          meals: ["Breakfast"],
          altitude: 820,
          images: [img("phewa-lake")],
        },
        {
          title: "Drive to Chitwan",
          description:
            "South out of the hills into the Terai. Afternoon village walk in Sauraha and sunset over the Rapti river.",
          accommodation: "Jungle lodge in Sauraha",
          meals: FULL_BOARD,
          altitude: 150,
          duration: "5 hrs by road",
        },
        {
          title: "Chitwan National Park",
          description:
            "A dawn jeep safari into the park for rhinoceros, deer and — if the day is generous — a tiger, then a dugout canoe down the Rapti among gharial and marsh mugger.",
          accommodation: "Jungle lodge in Sauraha",
          meals: FULL_BOARD,
          altitude: 150,
          duration: "Full day",
          images: [img("chitwan-rhino")],
        },
        {
          title: "Return to Kathmandu",
          description:
            "The drive back up to the valley, or a 25-minute flight for a supplement, and a transfer to your onward connection.",
          meals: ["Breakfast"],
          altitude: 1400,
          duration: "6 hrs by road",
        },
      ]),
      inclusions: [
        "Private air-conditioned vehicle throughout",
        "Seven nights accommodation, bed and breakfast in cities",
        "Full board at the Chitwan jungle lodge",
        "Half-day rafting on the Trishuli with all equipment",
        "Jeep safari, canoe trip and guided walks in Chitwan",
        "English-speaking cultural guide and a licensed naturalist",
        "All monument and national park entry fees",
      ],
      exclusions: [
        "International flights and Nepal visa",
        "Lunch and dinner in Kathmandu and Pokhara",
        "Chitwan–Kathmandu flight upgrade (USD 130)",
        "Paragliding and other optional activities in Pokhara",
        "Tips and personal expenses",
      ],
      highlights: [
        "Seven UNESCO monument zones in the Kathmandu valley",
        "Sunrise over the Annapurnas from Sarangkot",
        "Half a day rafting the Trishuli on the drive west",
        "Greater one-horned rhinoceros in Chitwan",
        "Nothing above 1,400 metres and no trekking at all",
      ],
      faqs: tourFaqs("kathmandu-pokhara-chitwan", [
        {
          question: "Is this suitable for children?",
          answer:
            "Yes, and it is the trip we recommend to families. There is no altitude, no long walking, and the jungle safari and the boat trips are the parts children remember. We can add a second room at a reduced supplement.",
        },
        {
          question: "Will we see a tiger in Chitwan?",
          answer:
            "Probably not, and we would rather say so. Chitwan has around 125 tigers across 950 square kilometres. Rhinoceros are close to guaranteed, deer and crocodile certain, sloth bear and wild elephant possible.",
        },
        {
          question: "Can I skip the rafting?",
          answer:
            "Of course. Tell us when you book and we will drive straight through to Pokhara, arriving three hours earlier.",
        },
      ]),
      bestSeason: [
        "January",
        "February",
        "March",
        "October",
        "November",
        "December",
      ],
      featured: false,
      order: 5,
      seo: seo({
        description:
          "An 8-day Nepal tour: Kathmandu valley heritage, Pokhara and Phewa Lake, and a jungle safari in Chitwan. No trekking. From USD 890.",
      }),
    },
  ];

  /* ----------------------------------------------------------------- posts */

  const postSources = [
    {
      slug: "what-to-pack-everest-base-camp",
      title: "What to Pack for the Everest Base Camp Trek",
      excerpt:
        "A working kit list from fourteen seasons in the Khumbu, including the four things people always bring and never use.",
      category: "Preparation",
      tags: ["everest", "gear", "preparation"],
      image: "yak-caravan",
      daysAgo: 12,
      content: `Every operator publishes a kit list. Most of them are the manufacturer's catalogue with the prices removed. This one is the list our guides actually check at the briefing, with notes on what matters.

## The three things that decide your trek

**Boots you have already walked in.** Not new boots. Not boots you wore twice on a weekend. Two hundred kilometres of trail is not where you discover a hot spot. If your boots are new, wear them every day for a month before you fly.

**A four-season sleeping bag.** Lodges heat the dining room and nothing else. At Gorak Shep in November the bedroom drops to −10 °C. We lend a bag rated to −20 °C and it is included; bring your own only if you like it better.

**A down jacket.** Also lent, also included. You will live in it from Dingboche onwards.

## Layers, in the order you will put them on

- Two merino base layers, long sleeved. Merino because you will wear each of them for four days.
- A fleece or light synthetic midlayer.
- A hard shell jacket, properly waterproof. It rains below Namche in April.
- Trekking trousers, two pairs, one of them lined.
- A down jacket for mornings, evenings and the whole of the last four days.

## What people always bring and never use

1. **A water filter pump.** Boiled water is sold at every lodge and it is cheaper than the fuel to purify your own. Bring purification tablets as a backup and leave the pump at home.
2. **Jeans.** They are heavy, they are cold, and wet denim does not dry at 4,000 metres.
3. **A full first aid kit.** Your guide carries one. Bring your own personal medication, blister plasters and painkillers, and nothing else.
4. **More than two books.** Weight is carried by a person.

## The small things that matter more than they should

A head torch with a fresh battery, because the dining room lights go off at nine. A power bank, because charging costs USD 3 an hour above Namche. Lip balm with sun protection — the combination of altitude, dry air and reflected snow does real damage. And ear plugs: teahouse walls are plywood.

## Luggage

Your porter carries one duffel, 20 kg maximum between two of you, and we lend the duffel. You carry a day pack of 25–30 litres with water, a layer, your camera and your documents. Anything you do not need on the trek stays in the hotel in Kathmandu at no charge.`,
    },
    {
      slug: "altitude-sickness-what-to-know",
      title: "Altitude Sickness: What Every Trekker Should Know",
      excerpt:
        "How acute mountain sickness actually presents, what our guides watch for, and the one rule that has no exceptions.",
      category: "Health",
      tags: ["health", "altitude", "safety"],
      image: "kala-patthar",
      daysAgo: 26,
      content: `Altitude is the single largest risk on a Himalayan trek, and it is also the most manageable. Almost everyone who gets into serious trouble does so for one of two reasons: they went up too fast, or they kept going after their body said not to.

## What is actually happening

Above about 2,500 metres there is measurably less oxygen in each breath. Your body responds by breathing faster and making more red blood cells, and that adjustment takes days. Go up faster than it can adjust and fluid begins to leak into tissue — first the brain, which is acute mountain sickness, and in rare cases the lungs.

## The symptoms, in the order they usually arrive

- **Headache.** Nearly universal above 4,000 metres and not alarming on its own.
- **Poor sleep**, often with periodic breathing that wakes you gasping. Unpleasant, normal.
- **Loss of appetite** and mild nausea.
- **Fatigue out of proportion** to the day's walking.

Mild AMS is a headache plus one of the others. It is common, it is not dangerous, and the correct response is to stop climbing — not to descend, just to stop — until it clears.

## When it stops being routine

Get to lower ground immediately, at any hour, if you see:

- **Ataxia** — an inability to walk a straight line heel to toe. This is the single most reliable sign, and it is the one our guides test.
- **Confusion**, strange behaviour or unusual drowsiness.
- **Breathlessness at rest**, or a wet, bubbling cough.

These are HACE and HAPE. Both are life-threatening and both improve dramatically with descent. Six hundred metres down is usually enough to transform the picture.

## The rule with no exceptions

**Descent is never wrong.** Not once in fourteen seasons has anyone regretted going down. Plenty have regretted going up.

Our guides carry a pulse oximeter and record everyone's saturation each evening. It is a useful trend, not a verdict — a single low reading in a cold hand means very little. What matters is the direction of travel and how you feel walking.

## What actually prevents it

Walk slowly. Slower than feels reasonable. The fit young trekkers are the ones who get into trouble, because they can outpace their own acclimatisation.

Drink three to four litres a day. Sleep no more than 500 metres higher than the night before above 3,000 metres, and take a rest day every 1,000. Both our Everest itineraries are built on exactly this.

Acetazolamide (Diamox) genuinely works as a preventative — 125 mg twice daily, started the day before you go high. Talk to your own doctor before you fly, not to a pharmacy in Thamel.

Alcohol and sleeping tablets both suppress breathing at night. Leave them alone above Namche.`,
    },
    {
      slug: "when-to-trek-in-nepal",
      title: "When to Trek in Nepal: A Month-by-Month Guide",
      excerpt:
        "Autumn is the obvious answer and it is not always the right one. What each season actually looks like on the trail.",
      category: "Planning",
      tags: ["planning", "seasons", "weather"],
      image: "rhododendron-forest",
      daysAgo: 41,
      content: `Nepal has two trekking seasons and two that people are told to avoid. The received wisdom is roughly right and misses a good deal.

## October and November — the best air of the year

The monsoon clears in the first days of October and takes the dust with it. Visibility is extraordinary, days are warm, nights are cold and clear. It is the finest trekking weather on earth and everyone knows it: Namche in the third week of October is busy, and lodges at Gorak Shep can run out of rooms.

Book early, start early each morning, and accept that you are sharing the trail.

## March, April and May — flowers and haze

Spring is warmer and much quieter than autumn. Rhododendron forest between 2,000 and 3,500 metres flowers scarlet through March and April, which is reason enough on its own for Annapurna.

The trade-off is haze. Dust and agricultural burning build through spring, and by May the middle-distance views are milky even when the peaks are clear. Go high, above the haze layer, and it hardly matters.

May is also the Everest summit season, so the Khumbu is full of expedition traffic — more interesting than inconvenient.

## June to September — the monsoon

Rain most afternoons, cloud most mornings, leeches in the forest below 3,000 metres, and flights to Lukla and Jomsom cancelled for days at a time. Not the season for Everest or Annapurna.

It is, however, the only season for **Mustang and Dolpo**, which sit north of the main Himalayan chain and stay dry. Green barley, clear skies and empty trails, in the months when everyone else has gone home. If your holiday is fixed to July, this is where you go.

## December to February — cold and completely clear

Underrated. The air after the autumn crowds have gone is as clear as October and the trails are empty. Everest Base Camp is entirely walkable in December, and many lodges stay open.

It is properly cold — −20 °C at Gorak Shep is normal in January — and some high lodges close. The Annapurna Sanctuary is the one place we avoid, because the approach gorge is avalanche-prone after heavy snow.

## The short version

| If you want | Go |
|---|---|
| The clearest possible views | Late October to early December |
| Rhododendron in flower | Mid-March to late April |
| Empty trails and hard frost | December and January |
| To walk in the monsoon | Upper Mustang, June to August |
| Everest without the crowds | Early December |`,
    },
    {
      slug: "flying-into-lukla",
      title: "Flying into Lukla",
      excerpt:
        "The sixteen-minute flight that starts every Everest trek, why it gets cancelled, and how to plan so a lost day does not cost you the trip.",
      category: "Trails",
      tags: ["everest", "lukla", "flights", "planning"],
      image: "lukla-airport",
      daysAgo: 58,
      content: `Tenzing-Hillary Airport sits at 2,840 metres on a shelf cut into the hillside above Lukla. The runway is 527 metres long, slopes uphill at about 12 per cent so that gravity helps aircraft stop, and ends at a stone wall. There is no instrument approach and no go-around: once committed, a pilot lands.

It is also completely routine. Twin Otters and Dorniers have been flying it since 1964, the pilots who fly it are the most experienced in the country, and the whole thing takes sixteen minutes.

## Why flights are cancelled

Not wind, usually — cloud. The approach is visual, and the valley fills in. A morning that is clear in Kathmandu can be closed at Lukla and the other way round, so aircraft sometimes take off and turn back.

Flights go in the morning, almost always before eleven, because the valley wind builds through the day. If you are not away by lunchtime you are not going.

Cancellations are more common in the monsoon, and common enough in the shoulder weeks of any season to plan around.

## Kathmandu or Manthali

In the busy weeks of spring and autumn, Lukla flights are moved from Kathmandu to Manthali in Ramechhap, a four-hour drive east of the capital, to reduce congestion. That means a two o'clock departure from your hotel and a flight at first light.

It is unglamorous and it is genuinely more reliable — the Manthali approach is shorter and less weather-dependent. When our itineraries say the transfer leaves at 2 a.m., this is why.

## How to plan around it

**Build in a contingency day.** Every one of our Everest itineraries holds a spare day in Kathmandu at the end for exactly this. A trek without one is a trek that gambles your international flight.

**Do not book a tight onward connection.** Give yourself 48 hours in Kathmandu after the scheduled return.

**Know the helicopter option.** When aircraft are grounded for days, helicopters often still fly, and a shared charter out of Lukla runs around USD 500 a head with five aboard. Some travel insurance covers it as a delay expense; most does not.

## What the flight is actually like

Loud, and over quickly. Sit on the left going up for the best of the Himalaya. The landing looks alarming from the window and is not — you will be on the ground and walking within three minutes of the wheels touching, because the aircraft is turning straight round to go back.`,
    },
    {
      slug: "life-in-a-teahouse",
      title: "Life in a Teahouse",
      excerpt:
        "What a night in a Himalayan lodge is actually like — the food, the cold, the dal bhat, and why the dining room matters more than the bedroom.",
      category: "Culture",
      tags: ["culture", "teahouse", "food"],
      image: "namche-homestay",
      daysAgo: 74,
      content: `Teahouse trekking is the reason Nepal is walkable by people who would never carry a tent. Every village on the main trails has lodges, and they have been taking in trekkers for fifty years.

## The room

Plywood walls, two single beds with a foam mattress, a blanket, a window that does not seal. No heating. At 4,000 metres your bedroom is the outside temperature plus a degree or two, which is why the sleeping bag matters and the room does not.

Higher up, the rooms get simpler and colder. At Gorak Shep they are essentially a box.

## The dining room

Where everything actually happens. One stove burning yak dung or kerosene in the middle, benches round the walls, and everyone in the village's trekking population in it from five in the evening. You eat, you play cards, you talk to people from six countries, and at nine o'clock the generator goes off and everyone goes to bed.

The economics are worth knowing: lodges charge almost nothing for a room — often USD 3 to 5 — and make their money on food. Eat where you sleep. Arriving, eating elsewhere and coming back to sleep is a real discourtesy.

## The food

**Dal bhat** is lentil soup, rice, curried vegetable and pickle, and it comes with free refills. This is not a promotional gimmick; it is the deal, and it is why every guide and porter in Nepal eats it twice a day. Order it and you will be fed until you stop.

Beyond dal bhat, expect fried rice, noodle soup, momo dumplings, potatoes in several forms, porridge, eggs and apple pie — which is everywhere above Namche and better than it has any right to be.

Two pieces of advice our guides give without exception: **do not eat meat above Namche** — it has walked up for two days unrefrigerated — and eat vegetarian generally. A stomach upset at 4,500 metres ends treks.

## What costs money

Everything except the room, and prices climb with altitude because everything is carried:

- Hot shower: USD 3–6
- Charging a phone: USD 2–5 per device
- Wi-Fi: USD 2–8 a day
- Boiled drinking water: USD 1–4 a litre
- A pot of tea: USD 2–5

Budget USD 30–40 a day above what your trek includes, and carry small notes — there are no cash machines past Namche.

## The etiquette

Take your boots off at the door. Pass mani walls and chortens on the left, which keeps them on your right. Ask before photographing anyone. Do not ask for a discount on a room; the margin you are haggling over is the family's income and it is already close to nothing.`,
    },
    {
      slug: "permits-and-paperwork",
      title: "Permits and Paperwork for Trekking in Nepal",
      excerpt:
        "TIMS, conservation area permits, restricted-area permits and the guide requirement — what you need, what it costs, and who arranges it.",
      category: "Planning",
      tags: ["planning", "permits", "paperwork"],
      image: "mustang-trail",
      daysAgo: 96,
      content: `Nepal's permit system is straightforward once you know which of three categories your trek falls into. If you are booked with an agency, all of this is arranged for you — but it is worth understanding what you are paying for.

## Category one: the national parks and conservation areas

Everest, Annapurna and Langtang all fall here. You need two things:

**The park or conservation area permit.** Sagarmatha National Park is NPR 3,000 for foreign nationals; the Annapurna Conservation Area and Langtang National Park are the same. Issued in Kathmandu or Pokhara, or at the park entrance.

**A trekking registration.** The TIMS card, NPR 2,000 through a registered agency. The Khumbu is the exception — since 2018 it has used its own rural municipality permit instead, NPR 2,000, bought at Lukla or Monjo.

## Category two: restricted areas

Upper Mustang, Dolpo, Manaslu, Nar Phu and Kanchenjunga. These need a special permit on top of the conservation permit, and three conditions apply without exception:

1. It must be issued through a licensed Nepali trekking agency. You cannot apply yourself.
2. There is a **minimum of two trekkers** in the party.
3. A licensed guide must accompany you.

Upper Mustang is USD 500 per person for ten days, then USD 50 a day. Manaslu is USD 100 per person a week in the high season. These are per-person and non-refundable once issued, which is why we ask for the permit portion at booking rather than on arrival.

## Category three: everything else

Some short treks in the middle hills need no permit at all.

## The guide requirement

Since April 2023 the Nepal Tourism Board has required trekkers in national parks and conservation areas to be accompanied by a licensed guide. Solo trekking on the main trails is no longer permitted.

Enforcement varies by checkpost and the rule has been argued about a great deal. We follow it as written.

## What you need to hand over

- Your **passport**, valid six months beyond your return date.
- **Two to four passport photographs.** Bring six; they get used up.
- Your **visa**, which most nationalities can buy on arrival at Kathmandu airport — USD 30 for 15 days, USD 50 for 30, USD 125 for 90, in cash.
- Your **insurance certificate**, showing helicopter evacuation cover and the altitude it extends to.

## Rough total

For a standard Everest Base Camp trek, permits come to around USD 55 per person. For Upper Mustang, USD 530. The difference is the whole reason Mustang costs what it does.`,
    },
  ];

  const posts = postSources.map((source, index) => ({
    ...record("posts", source.slug, source.daysAgo),
    title: source.title,
    slug: source.slug,
    excerpt: source.excerpt,
    content: source.content,
    // The blog's detail page renders `content`, not blocks, so an empty body is
    // the honest value here rather than a block list nothing draws.
    body: [],
    featuredImage: img(source.image),
    authorId: author.id,
    authorName: author.name,
    category: source.category,
    tags: source.tags,
    readingMinutes: readingMinutes(source.content),
    order: index,
    seo: seo({ description: source.excerpt }),
  }));

  /* ----------------------------------------------------------------- pages */

  const block = (pageSlug, index, type, props) => ({
    id: stableId(`block:${pageSlug}:${index}`),
    type,
    props,
  });

  /**
   * A page that exists only to give a hand-built route its title and
   * description. `config/routes.ts` marks these `cmsMetadata: true`, so the
   * developer keeps the markup and the client still owns the SEO. The body is
   * empty because nothing renders it.
   */
  const metadataPage = (slug, title, excerpt, description, image) => ({
    ...record("pages", slug, 250),
    title,
    slug,
    excerpt,
    body: [],
    featuredImage: image ?? null,
    parentId: null,
    order: 0,
    showInNavigation: false,
    template: null,
    meta: {},
    seo: seo({ description, ogImage: image ?? null }),
  });

  const pages = [
    metadataPage(
      "/",
      // Not "Mission Himalaya": the layout appends the site name to every page
      // title, and a home page named after the site reads "X · X" in the tab.
      "Trekking in Nepal",
      "Small-group trekking and travel in Nepal, run by guides who live in the valleys they walk you through.",
      "Small-group trekking in Nepal: Everest Base Camp, the Annapurna Sanctuary, Langtang and Upper Mustang, with licensed local guides.",
      img("ama-dablam"),
    ),
    metadataPage(
      "/destinations",
      "Destinations",
      "Six places in Nepal we know well enough to send you to.",
      "Trekking destinations in Nepal: Everest Base Camp, the Annapurna Sanctuary, Langtang, Upper Mustang, Kathmandu and Pokhara.",
      img("khumbu-trail"),
    ),
    metadataPage(
      "/tours",
      "Trips",
      "Six itineraries, from an eight-day cultural circuit to a 6,189-metre summit.",
      "Trekking and climbing trips in Nepal, with full itineraries, inclusions and prices. Everest, Annapurna, Langtang, Mustang and Island Peak.",
      img("everest-base-camp"),
    ),
    metadataPage(
      "/activities",
      "Activities",
      "Teahouse trekking, peak climbing, heritage, jungle and river.",
      "What you can do in Nepal with us: teahouse trekking, peak climbing, cultural tours, jungle safari, rafting and mountain flights.",
      img("trishuli-rafting"),
    ),
    metadataPage(
      "/blog",
      "Journal",
      "Practical writing about trekking in Nepal, from the people who guide it.",
      "Notes on trekking in Nepal: kit lists, altitude, seasons, permits and what a teahouse night is actually like.",
      img("gokyo-lake"),
    ),
    metadataPage(
      "/faqs",
      "Frequently Asked Questions",
      "Visas, insurance, fitness, money and what happens when a flight is cancelled.",
      "Common questions about trekking in Nepal: visas, permits, insurance, fitness, altitude, money and flight delays.",
      null,
    ),
    metadataPage(
      "/contact",
      "Contact Us",
      "Tell us your dates and we will put a route together.",
      "Get in touch with Mission Himalaya. Tell us your dates and what you want from Nepal, and we will reply within one working day.",
      null,
    ),
    {
      ...record("pages", "/about", 248),
      title: "About Us",
      slug: "/about",
      excerpt:
        "Twelve guides, one office in Thamel, and fourteen seasons of walking the same valleys.",
      body: [
        block("/about", 1, "hero", {
          heading: "We live in the valleys we walk you through",
          subheading:
            "Mission Himalaya is a Nepali company. Every guide on our staff is licensed, salaried and insured, and most of them grew up within two days' walk of a route we sell.",
          image: img("namche-bazaar"),
          ctaLabel: "See our trips",
          ctaHref: "/tours",
        }),
        block("/about", 2, "rich-text", {
          content: `## How we started

Mission Himalaya began in 2011 with two guides, a rented desk in Thamel and a website built over a winter. We now run around 140 departures a year with twelve full-time guides and a seasonal crew of about forty porters.

We have deliberately not grown faster than that. The thing that makes a trek good is the person walking in front of you, and there is a limit to how many of those you can find, train and keep.

## What we do differently

**We employ our guides, we do not hire them per trip.** They are on a salary through the monsoon, when nobody is trekking and every freelance guide in Nepal is looking for work. It costs us more and it is why our people stay.

**Our porters carry 20 kg, not 35.** The load limit is ours, not the law's. They are insured to the same level as the guides, equipped by us, and paid above the union rate.

**We build in the acclimatisation days that the cheap itineraries cut.** A ten-day Everest Base Camp trek exists and we will not sell one.

**We would rather turn you around.** Not one guide on our staff has ever been questioned for bringing a client down early, and several have been thanked for it.`,
        }),
        block("/about", 3, "destination-grid", {
          heading: "Where we work",
          limit: 6,
          featuredOnly: false,
        }),
        block("/about", 4, "testimonials", {
          heading: "What people say afterwards",
          limit: 3,
          featuredOnly: true,
        }),
        block("/about", 5, "cta", {
          heading: "Ready when you are",
          text: "Tell us your dates and roughly what you want from Nepal, and we will put a route together. No deposit until the itinerary is right.",
          buttonLabel: "Start planning",
          buttonHref: "/contact",
        }),
      ],
      featuredImage: img("namche-bazaar"),
      parentId: null,
      order: 1,
      showInNavigation: true,
      template: null,
      meta: {},
      seo: seo({
        description:
          "Mission Himalaya is a Nepali trekking company with twelve salaried guides, a 20 kg porter limit and itineraries built around acclimatisation.",
        ogImage: img("namche-bazaar"),
      }),
    },
    {
      ...record("pages", "/responsible-travel", 190),
      title: "Responsible Travel",
      slug: "/responsible-travel",
      excerpt:
        "What we pay our crew, what we carry out, and the things we have not solved yet.",
      body: [
        block("/responsible-travel", 1, "rich-text", {
          content: `## Our crew

Porter welfare is the part of Nepali trekking that the industry is worst at, so we will be specific.

- **Load limit: 20 kg per porter.** The Nepal government's guidance is 30 and the International Porter Protection Group recommends 20. We use the lower number.
- **Insurance for every member of staff**, covering helicopter rescue to the altitude of the trek they are on. It is checked before each departure.
- **Equipment provided, not deducted**: boots, jacket, sleeping bag, gloves and sunglasses, issued by us and kept by them.
- **Salaried guides, paid through the monsoon.** Twelve months of pay for eight months of work.
- **The same lodges, the same food.** Our crew eat and sleep where our clients do.

## What we carry out

Every departure carries out its own waste, including the batteries and packaging that lodges cannot dispose of. Since 2019 we have also carried a share of what we find: an average of 11 kg of other people's rubbish per Everest departure.

We do not sell bottled water. Every trekker gets a filter bottle to keep, and boiled water is included in the trip price so there is no incentive to buy plastic. A fourteen-day Everest trek that buys three litres a day puts 42 bottles into a valley with no way to remove them.

## What we have not solved

**Flights.** A Lukla flight is the only practical way into the Khumbu and it is carbon-expensive. We offset every domestic flight we book through a cookstove programme in Nuwakot, and we know an offset is not the same as not flying.

**Helicopter evacuation fraud.** Nepal has a real problem with unnecessary evacuations billed to insurers. We evacuate on a guide's clinical judgement and never on a commission, and we will always give you the written record.

**Seasonality.** Two-thirds of our income arrives in ten weeks of the year. That is hard on the whole industry and we have not found a way round it.`,
        }),
        block("/responsible-travel", 2, "cta", {
          heading: "Ask us anything about this",
          text: "If you want the numbers behind any of the above, or the name of the insurer we use, write and ask.",
          buttonLabel: "Get in touch",
          buttonHref: "/contact",
        }),
      ],
      featuredImage: img("yak-caravan"),
      parentId: null,
      order: 2,
      showInNavigation: true,
      template: null,
      meta: {},
      seo: seo({
        description:
          "Porter load limits, crew insurance, waste carried out and the problems we have not solved. Mission Himalaya's responsible travel policy.",
        ogImage: img("yak-caravan"),
      }),
    },
    {
      ...record("pages", "/before-you-go", 184),
      title: "Before You Go",
      slug: "/before-you-go",
      excerpt:
        "Visas, insurance, vaccinations, money and training — the practical checklist for a first trip to Nepal.",
      body: [
        block("/before-you-go", 1, "rich-text", {
          content: `## Your passport and visa

Your passport must be valid for six months beyond your return date. Most nationalities can buy a visa on arrival at Kathmandu airport: USD 30 for 15 days, USD 50 for 30 days, USD 125 for 90 days, payable in cash. Bring the exact amount and two passport photographs.

## Insurance — read this twice

This is the one thing we cannot arrange for you and the one thing that matters most.

Your policy must cover **helicopter evacuation** and it must extend to **the maximum altitude of your trek**. Many standard policies stop at 4,000 metres, which does not reach Everest Base Camp. For Island Peak you need cover to 6,500 metres and an explicit mountaineering clause.

We ask for your certificate before departure and we do check the altitude limit.

## Vaccinations

No vaccination is required to enter Nepal. Commonly recommended are hepatitis A, typhoid, tetanus and, for longer stays, rabies and Japanese encephalitis. Malaria is a consideration in the Terai — Chitwan — but not in the hills. Speak to a travel clinic eight weeks before you fly.

## Money

Nepali rupees, and cash above Namche or Chhomrong. Cash machines exist in Kathmandu, Pokhara and Namche and nowhere higher; the Namche machine runs out.

Budget USD 30–40 a day on trek for drinks, showers, charging and Wi-Fi. Bring USD in cash for the visa and for permits, in clean notes — torn or marked bills are refused.

Tipping is customary and not obligatory. The usual guidance is 10 per cent of the trip cost, split roughly two-thirds to the guide and one-third across the porters, given at the end.

## Training

Whatever you do, do it with a loaded pack on hills. Twelve weeks out, aim for one long walk a week building to six hours with 700 metres of ascent, plus two shorter sessions.

Altitude cannot be trained for at sea level, and cardiovascular fitness does not predict who acclimatises well. What fitness buys you is the capacity to enjoy the walking rather than endure it.

## A week before you fly

- Confirm your insurance certificate shows the right altitude.
- Break in your boots, properly.
- Photograph your passport, visa, insurance and flight details, and email them to yourself.
- Tell your bank you are travelling.
- Pack your day pack and carry it around for an hour. It is heavier than you think.`,
        }),
        block("/before-you-go", 2, "faq", {
          heading: "Still wondering?",
          limit: 8,
          category: "",
        }),
      ],
      featuredImage: img("khumbu-trail"),
      parentId: null,
      order: 3,
      showInNavigation: true,
      template: null,
      meta: {},
      seo: seo({
        description:
          "Practical preparation for trekking in Nepal: visas, insurance altitude limits, vaccinations, money, tipping and a twelve-week training plan.",
        ogImage: img("khumbu-trail"),
      }),
    },
  ];

  /* ---------------------------------------------------------- testimonials */

  const testimonialSources = [
    {
      key: "hannah-whitlock",
      name: "Hannah Whitlock",
      rating: 5,
      position: "Architect",
      country: "United Kingdom",
      tour: "everest-base-camp-trek",
      featured: true,
      message:
        "Pemba turned us around at Lobuche when my partner's oxygen saturation dropped two nights running. We were disappointed for about an hour, and then we walked down and he was a different person by Pheriche. We went back the following spring with the same guide and made it. That decision is the reason I would book with them again.",
    },
    {
      key: "marco-ferretti",
      name: "Marco Ferretti",
      rating: 5,
      position: "Software engineer",
      company: "Trentino",
      country: "Italy",
      tour: "island-peak-climb",
      featured: true,
      message:
        "I had done via ferrata and nothing else. The skills day at Chhukung was worth the whole trip on its own — by the time we were on the headwall at four in the morning the jumar felt like something I had always known how to use. Two guides for four climbers, and never once did it feel rushed.",
    },
    {
      key: "aroha-ngata",
      name: "Aroha Ngata",
      rating: 5,
      position: "Teacher",
      country: "New Zealand",
      tour: "annapurna-base-camp-trek",
      featured: true,
      message:
        "We came in late March for the rhododendrons and they were absurd — entire hillsides of red. The hot springs at Jhinu on the way out are the single best-placed thing on any trek I have done. Small group, brilliant food, and a guide who noticed my knee before I said anything and produced a strap.",
    },
    {
      key: "david-and-ruth-okonjo",
      name: "David and Ruth Okonjo",
      rating: 5,
      position: "Travelling with two children, 9 and 12",
      country: "Kenya",
      tour: "kathmandu-pokhara-chitwan",
      featured: false,
      message:
        "Eight days with two children and not one dull afternoon. The rafting on the way to Pokhara was the highlight for our son; the rhino at twenty metres on the jeep safari did it for our daughter. Sanjay adjusted the pace around them constantly without ever making it obvious.",
    },
    {
      key: "lena-brunner",
      name: "Lena Brunner",
      rating: 4,
      position: "Physiotherapist",
      country: "Austria",
      tour: "langtang-valley-trek",
      featured: false,
      message:
        "Nine days, no flight, and I was at nearly 5,000 metres on Tserko Ri by day five — exactly what I wanted with limited leave. The drive to Syabrubesi is every bit as rough as they warn you, and they do warn you. Half a star off for that road and nothing else.",
    },
    {
      key: "yuki-tanaka",
      name: "Yuki Tanaka",
      rating: 5,
      position: "Photographer",
      country: "Japan",
      tour: "upper-mustang-trek",
      featured: true,
      message:
        "I went in July, when I was told nowhere in Nepal was walkable. Fourteen days of dry weather, barley coming in green, and the murals at Thubchen with nobody else in the room. Dorje knew every family in every village we stopped in. I have not stopped thinking about Lo Manthang.",
    },
    {
      key: "tom-alvarez",
      name: "Tom Alvarez",
      rating: 5,
      position: "Retired paramedic",
      country: "United States",
      tour: "everest-base-camp-trek",
      featured: false,
      message:
        "I am sixty-three and I was the oldest in the group by fifteen years. Nobody made anything of it. The pace was slow by design, the two acclimatisation days did their job, and I stood on Kala Patthar at sunrise with my son. As a former paramedic I will add that their medical kit and their altitude protocol were better than I expected.",
    },
    {
      key: "priya-raman",
      name: "Priya Raman",
      rating: 5,
      position: "Doctor",
      country: "India",
      tour: "everest-base-camp-trek",
      featured: false,
      message:
        "The guiding was extraordinary. We were never once rushed, and the teahouse at Tengboche was worth the climb on its own. What struck me most was how the crew were treated — same food, same lodges, proper kit. You notice it, and it changes how the whole trek feels.",
    },
  ];

  const testimonials = testimonialSources.map((source, index) => ({
    ...record("testimonials", source.key, 30 + index * 17),
    name: source.name,
    image: null,
    rating: source.rating,
    message: source.message,
    position: source.position ?? null,
    company: source.company ?? null,
    country: source.country ?? null,
    tourId: source.tour ? idFor("tours", source.tour) : null,
    featured: source.featured,
    order: index,
  }));

  /* ------------------------------------------------------------------ faqs */

  const faqSources = [
    {
      key: "visa",
      category: "Visas and permits",
      question: "Do I need a visa for Nepal?",
      answer:
        "Most nationalities can buy a visa on arrival at Kathmandu airport: USD 30 for 15 days, USD 50 for 30 and USD 125 for 90, payable in cash. Bring two passport photographs and a passport valid for six months beyond your return date. A handful of nationalities must apply in advance — check with your nearest Nepali embassy.",
    },
    {
      key: "permits-arranged",
      category: "Visas and permits",
      question: "Do you arrange trekking permits?",
      answer:
        "Yes. National park and conservation area permits, trekking registration and restricted-area permits are all included in the trip price and arranged by us. We need your passport for a day in Kathmandu to do it. Restricted-area permits for Upper Mustang and Manaslu are non-refundable once issued, which is why that portion is taken at booking.",
    },
    {
      key: "solo-guide",
      category: "Visas and permits",
      question: "Can I trek solo without a guide?",
      answer:
        "Not in the national parks and conservation areas. Since April 2023 the Nepal Tourism Board has required trekkers in those areas to be accompanied by a licensed guide, and restricted areas have required both a guide and a minimum party of two for much longer.",
    },
    {
      key: "fitness",
      category: "Before you book",
      question: "How fit do I need to be?",
      answer:
        "For a teahouse trek: fit enough to walk six to seven hours a day, several days running, at a deliberately slow pace. That is less than people fear. Train by walking hills with a loaded pack rather than by running. Altitude tolerance and cardiovascular fitness are not the same thing, and fitness does not predict who acclimatises well.",
    },
    {
      key: "insurance",
      category: "Before you book",
      question: "What travel insurance do I need?",
      answer:
        "A policy covering helicopter evacuation to the maximum altitude of your trek. Many standard policies stop at 4,000 metres, which does not cover Everest Base Camp at 5,364. For a climbing trip you need explicit mountaineering cover to 6,500 metres. We ask to see the certificate before departure and we do check the altitude.",
    },
    {
      key: "age-limits",
      category: "Before you book",
      question: "Is there an age limit?",
      answer:
        "No upper limit. Our oldest Everest Base Camp client was 74 and our oldest Island Peak summiteer was 61. For high-altitude treks we ask trekkers over 65 for a doctor's letter. For the low-altitude cultural and jungle trips, children from about six upwards do very well.",
    },
    {
      key: "altitude-risk",
      category: "On the trail",
      question: "What happens if I get altitude sickness?",
      answer:
        "Mild symptoms — headache, poor sleep, no appetite — are common above 4,000 metres and are managed by not going higher until they clear. Your guide records oxygen saturation each evening and carries a first aid kit. If descent is needed, you descend, at any hour, and a guide goes with you. Serious cases are evacuated by helicopter on the guide's clinical judgement.",
    },
    {
      key: "food-water",
      category: "On the trail",
      question: "What is the food like, and can I drink the water?",
      answer:
        "Dal bhat — lentils, rice, vegetable curry — with free refills, plus noodles, momos, potatoes, eggs, porridge and surprisingly good apple pie. Vegetarian and vegan diets are easy; tell us about allergies at booking. Never drink untreated water. Boiled water is included in your trip price and we give every trekker a filter bottle to keep, so there is no reason to buy plastic.",
    },
    {
      key: "charging-wifi",
      category: "On the trail",
      question: "Can I charge my phone and get online?",
      answer:
        "Yes, on all the main trails, and both cost money — expect USD 2 to 5 per device to charge and USD 2 to 8 a day for Wi-Fi, rising with altitude. Bring a power bank. Mobile data works surprisingly far up the Khumbu on an Ncell or NTC local SIM, which is cheaper than lodge Wi-Fi.",
    },
    {
      key: "flight-cancelled",
      category: "Getting there",
      question: "What if my Lukla flight is cancelled?",
      answer:
        "It happens, mostly to cloud. Every Everest itinerary we run holds a contingency day in Kathmandu at the end for exactly this. If the delay runs longer we will arrange a shared helicopter at cost — typically USD 500 a head with five aboard. Never book a tight onward connection after a Lukla trek.",
    },
    {
      key: "payment",
      category: "Booking and payment",
      question: "How do I pay, and what is the deposit?",
      answer:
        "A 20 per cent deposit confirms a departure, with the balance due 30 days before arrival — or on arrival in Kathmandu, in cash, if you prefer. We take bank transfer and card; card payments carry a 4 per cent processing fee that we pass on at cost. Restricted-area permit costs are taken in full at booking because they cannot be refunded.",
    },
    {
      key: "cancellation",
      category: "Booking and payment",
      question: "What is your cancellation policy?",
      answer:
        "More than 45 days before departure: full refund less the deposit. Between 45 and 15 days: 50 per cent of the trip cost. Under 15 days: no refund, though we will transfer your booking to another departure within twelve months once at no charge. Restricted-area permits are non-refundable at any point once issued.",
    },
  ];

  const faqs = faqSources.map((source, index) => ({
    ...record("faqs", source.key, 120 + index),
    question: source.question,
    answer: source.answer,
    category: source.category,
    order: index,
  }));

  /* ------------------------------------------------------------- enquiries */

  const enquirySources = [
    {
      key: "enquiry-eliza-hart",
      name: "Eliza Hart",
      email: "e.hart@example.com",
      phone: "+44 7700 900412",
      country: "United Kingdom",
      message:
        "Two of us hoping to do Everest Base Camp in the second half of October. We have both walked in the Alps but neither of us has been above 3,500 m. Is the 14-day itinerary the right one, and are there still places on a departure around the 12th?",
      subjectType: "tour",
      subject: "everest-base-camp-trek",
      travelDate: "2026-10-12",
      travellers: 2,
      status: "quoted",
      source: "Website enquiry form",
      notes:
        "Sent the 14-day itinerary and the 12 Oct departure. Flagged that Manthali transfers apply in peak October.",
      daysAgo: 4,
    },
    {
      key: "enquiry-marcus-obrien",
      name: "Marcus O'Brien",
      email: "marcus.obrien@example.com",
      phone: null,
      country: "Ireland",
      message:
        "Looking at Upper Mustang for July. Travelling alone — you mention a minimum of two for the permit. Is there a departure I could join, and roughly what would the single supplement be?",
      subjectType: "tour",
      subject: "upper-mustang-trek",
      travelDate: "2026-07-06",
      travellers: 1,
      status: "contacted",
      source: "Website enquiry form",
      notes:
        "Two others provisionally on the 6 July departure. Waiting for them to confirm before offering the pairing.",
      daysAgo: 9,
    },
    {
      key: "enquiry-sofia-lindqvist",
      name: "Sofia Lindqvist",
      email: "sofia.l@example.com",
      phone: "+46 70 123 4567",
      country: "Sweden",
      message:
        "My father is 68 and has always wanted to see Everest but cannot manage a long trek. Is there a shorter option — a mountain flight, or a few days in the lower Khumbu? We would be four people in total.",
      subjectType: "destination",
      subject: "everest-base-camp",
      travelDate: "2026-11-20",
      travellers: 4,
      status: "new",
      source: "Website enquiry form",
      notes: null,
      daysAgo: 2,
    },
    {
      key: "enquiry-rahul-mehta",
      name: "Rahul Mehta",
      email: "rahul.mehta@example.com",
      phone: "+91 98200 11223",
      country: "India",
      message:
        "Family of four including children aged 9 and 13, eight days in late December. The Kathmandu, Pokhara and Chitwan itinerary looks right. Can you add a second room and is Chitwan good in December?",
      subjectType: "tour",
      subject: "kathmandu-pokhara-chitwan",
      travelDate: "2026-12-22",
      travellers: 4,
      status: "converted",
      source: "Website enquiry form",
      notes:
        "Booked, deposit received. Two rooms at both hotels, family room at the Sauraha lodge. December is the best month for Chitwan sightings — grass is cut.",
      daysAgo: 21,
    },
    {
      key: "enquiry-chen-wei",
      name: "Chen Wei",
      email: "chen.wei@example.com",
      phone: null,
      country: "Singapore",
      message:
        "Interested in Island Peak next April. I have led scrambles at home but have never used crampons. Is the skills day enough preparation, and what boots would you recommend I buy?",
      subjectType: "tour",
      subject: "island-peak-climb",
      travelDate: "2027-04-14",
      travellers: 1,
      status: "contacted",
      source: "Website enquiry form",
      notes:
        "Sent the kit list and the B2 boot guidance. Good candidate — strong scrambling background.",
      daysAgo: 13,
    },
    {
      key: "enquiry-amelie-rousseau",
      name: "Amélie Rousseau",
      email: "a.rousseau@example.com",
      phone: "+33 6 12 34 56 78",
      country: "France",
      message:
        "We are a group of six colleagues with only ten days including flights. Langtang looks like the only realistic option — could you confirm it fits, and whether you can run a private departure?",
      subjectType: "tour",
      subject: "langtang-valley-trek",
      travelDate: "2027-03-28",
      travellers: 6,
      status: "quoted",
      source: "Website enquiry form",
      notes:
        "Private departure quoted at group rate. Nine days on the ground leaves one spare — tight but workable.",
      daysAgo: 6,
    },
  ];

  const enquiries = enquirySources.map((source) => {
    const created = daysAgo(source.daysAgo);
    return {
      id: idFor("enquiries", source.key),
      name: source.name,
      email: source.email,
      phone: source.phone,
      country: source.country,
      message: source.message,
      subjectType: source.subjectType,
      subjectId:
        source.subjectType === "tour"
          ? idFor("tours", source.subject)
          : idFor("destinations", source.subject),
      travelDate: source.travelDate,
      travellers: source.travellers,
      status: source.status,
      notes: source.notes,
      source: source.source,
      createdAt: created,
      updatedAt:
        source.status === "new" ? created : daysAgo(Math.max(0, source.daysAgo - 1)),
    };
  });

  /* ----------------------------------------------------------------- menus */

  const menuItem = (menuKey, key, label, overrides = {}) => ({
    id: stableId(`menu-item:${menuKey}:${key}`),
    label,
    target: "custom",
    pageId: null,
    entityType: null,
    entityId: null,
    url: null,
    openInNewTab: false,
    visible: true,
    children: [],
    ...overrides,
  });

  const menus = [
    {
      id: idFor("menus", "main"),
      key: "main",
      name: "Header",
      items: [
        menuItem("main", "trips", "Trips", { url: "/tours" }),
        menuItem("main", "destinations", "Destinations", {
          url: "/destinations",
          children: [
            menuItem("main", "everest", "Everest Base Camp", {
              url: "/destinations/everest-base-camp",
            }),
            menuItem("main", "annapurna", "Annapurna Sanctuary", {
              url: "/destinations/annapurna-sanctuary",
            }),
            menuItem("main", "langtang", "Langtang Valley", {
              url: "/destinations/langtang-valley",
            }),
            menuItem("main", "mustang", "Upper Mustang", {
              url: "/destinations/upper-mustang",
            }),
          ],
        }),
        menuItem("main", "activities", "Activities", { url: "/activities" }),
        menuItem("main", "journal", "Journal", { url: "/blog" }),
        menuItem("main", "about", "About", {
          target: "page",
          pageId: idFor("pages", "/about"),
        }),
        menuItem("main", "contact", "Contact", { url: "/contact" }),
      ],
      createdAt: daysAgo(250),
      updatedAt: daysAgo(4),
    },
    {
      id: idFor("menus", "footer"),
      key: "footer",
      name: "Footer",
      items: [
        menuItem("footer", "about", "About us", {
          target: "page",
          pageId: idFor("pages", "/about"),
        }),
        menuItem("footer", "responsible", "Responsible travel", {
          target: "page",
          pageId: idFor("pages", "/responsible-travel"),
        }),
        menuItem("footer", "before-you-go", "Before you go", {
          target: "page",
          pageId: idFor("pages", "/before-you-go"),
        }),
        menuItem("footer", "faqs", "FAQs", { url: "/faqs" }),
        menuItem("footer", "contact", "Contact", { url: "/contact" }),
      ],
      createdAt: daysAgo(250),
      updatedAt: daysAgo(4),
    },
  ];

  /* -------------------------------------------------------------- settings */

  const settings = {
    siteName: "Mission Himalaya",
    tagline: "Trekking in Nepal, guided by people who live there",
    logo: null,
    favicon: null,
    locale: "en",
    timezone: "Asia/Kathmandu",
    contact: {
      email: "hello@missionhimalaya.example",
      phone: "+977 1 4700 112",
      whatsapp: "+977 981 234 5678",
      address: "Z Street, Thamel, Kathmandu 44600, Nepal",
    },
    social: {
      facebook: "https://facebook.com/example-missionhimalaya",
      instagram: "https://instagram.com/example-missionhimalaya",
      twitter: null,
      youtube: null,
      tripadvisor: null,
    },
    defaultSeo: {
      title: "Mission Himalaya — Trekking in Nepal",
      description:
        "Small-group trekking and travel in Nepal: Everest Base Camp, the Annapurna Sanctuary, Langtang and Upper Mustang, with licensed local guides.",
      ogImage: img("ama-dablam"),
      twitterCard: "summary_large_image",
      robots: "index",
    },
    // Left off deliberately: a seeded site you cannot look at is not much of a
    // demonstration. Turn it back on from /admin/settings.
    maintenanceMode: false,
  };

  return {
    regions,
    destinations,
    activities,
    tours,
    posts,
    pages,
    testimonials,
    faqs,
    enquiries,
    menus,
    settings,
  };
}
