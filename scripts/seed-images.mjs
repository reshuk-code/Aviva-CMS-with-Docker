/**
 * Photographs used by the demo content.
 *
 * Kept apart from the prose so a new client project can swap the picture
 * library without reading through a thousand lines of itinerary.
 *
 * Every photograph comes from Wikimedia Commons under CC BY, CC BY-SA or CC0.
 * `commons` is an exact file title rather than a search query on purpose: a
 * search re-run in six months returns different photographs, and a seed that
 * changes what it produces is not a seed. The seeder copies the author and
 * licence the API reports into each media item's `description`, so attribution
 * survives in the library instead of living only in this file.
 */
export const IMAGES = [
  /* --------------------------------------------------------------- everest */
  {
    name: "everest-base-camp",
    folder: "everest",
    commons: "File:Everest Base Camp from Kala Patther.jpg",
    alt: "Tents of Everest Base Camp spread across the moraine of the Khumbu Glacier",
    caption: "Everest Base Camp seen from Kala Patthar",
  },
  {
    name: "everest-khumbu-glacier",
    folder: "everest",
    commons: "File:Gokyo 03.JPG",
    alt: "Prayer flags strung across the view of Everest and Nuptse above the Khumbu Glacier",
    caption: "Everest and Nuptse from Kala Patthar, behind a line of prayer flags",
  },
  {
    name: "ama-dablam",
    folder: "everest",
    commons: "File:Ama Dablam, Nepal.jpg",
    alt: "The sharp snow ridge of Ama Dablam against a clear sky",
    caption: "Ama Dablam from Pheriche",
  },
  {
    name: "namche-bazaar",
    folder: "everest",
    commons: "File:Namche Bazaar, Nepal.jpg",
    alt: "The terraced bowl of Namche Bazaar, houses stacked up the hillside",
    caption: "Namche Bazaar, the Sherpa capital",
  },
  {
    name: "namche-homestay",
    folder: "everest",
    commons: "File:Namche Bazaar, Homestay, Nepal.jpg",
    alt: "A Sherpa woman in the kitchen of a homestay in Namche Bazaar",
    caption: "A homestay kitchen in Namche Bazaar",
  },
  {
    name: "tengboche-monastery",
    folder: "everest",
    commons: "File:Tengboche Buddhist Monastery, Nepal.jpg",
    alt: "The painted facade of Tengboche monastery below snow peaks",
    caption: "Tengboche monastery",
  },
  {
    name: "kala-patthar",
    folder: "everest",
    commons: "File:Kala Patthar Peak, Nepal, Asia.jpg",
    alt: "The dark rocky summit of Kala Patthar below the south ridge of Pumori",
    caption: "Kala Patthar, below the south ridge of Pumori",
  },
  {
    name: "khumbu-trail",
    folder: "everest",
    commons: "File:View of Everest Base Camp Trek.jpg",
    alt: "A trekking trail winding through the Khumbu valley",
    caption: "On the trail to Everest Base Camp",
  },
  {
    name: "gokyo-lake",
    folder: "everest",
    commons: "File:Machhermo Peaks, Gokyo Lake, Nepal, Himalayas.jpg",
    alt: "The turquoise water of Gokyo Lake beneath the Machhermo peaks",
    caption: "Gokyo Lake and the Machhermo peaks",
  },
  {
    name: "cho-la-pass",
    folder: "everest",
    commons: "File:Cho-La Pass, Nepal.jpg",
    alt: "Snow-covered rock on the Cho La pass between Dzongla and Thagnak",
    caption: "Crossing the Cho La in fresh snow",
  },
  {
    name: "lukla-airport",
    folder: "everest",
    commons: "File:Lukla Airport, Nepal.jpg",
    alt: "The short sloping runway of Tenzing-Hillary Airport at Lukla",
    caption: "Tenzing-Hillary Airport, Lukla",
  },
  {
    name: "yak-caravan",
    folder: "everest",
    commons: "File:Dole, Dudh Koshi Valley, Yaks, Khumbu, Nepal.jpg",
    alt: "A caravan of loaded yaks on a trail in the Dudh Koshi valley",
    caption: "Yaks carrying loads north of Dole",
  },
  {
    name: "imja-tse",
    folder: "everest",
    commons: "File:Dingboche-18-Imja Tse-2007-gje.jpg",
    alt: "Imja Tse, known as Island Peak, seen from the village of Dingboche",
    caption: "Imja Tse (Island Peak) from Dingboche",
  },
  {
    name: "imja-tse-camp",
    folder: "everest",
    commons: "File:Chhukung to Imja Tse Camp-24-Nuptse-Imja Tse-2007-gje.jpg",
    alt: "The south face of Nuptse above the approach to Island Peak base camp",
    caption: "Nuptse, on the walk in to Imja Tse base camp",
  },
  {
    name: "namche-mural",
    folder: "everest",
    commons: "File:Namche Bazaar, Mural, Buddhist art, Nepal.jpg",
    alt: "A painted Buddhist mural on a wall in Namche Bazaar",
    caption: "Buddhist mural art, Namche Bazaar",
  },

  /* ------------------------------------------------------------- annapurna */
  {
    name: "machhapuchhre",
    folder: "annapurna",
    commons: "File:Peak of Mount Machhapuchhre of Nepal.jpg",
    alt: "The twin fishtail summit of Machhapuchhre in the Annapurna massif",
    caption: "Machhapuchhre, the fishtail peak",
  },
  {
    name: "annapurna-base-camp",
    folder: "annapurna",
    commons: "File:Annapurna Base Camp PANO 20180327 074437.jpg",
    alt: "The ring of peaks enclosing the Annapurna Sanctuary at dawn",
    caption: "First light in the Annapurna Sanctuary",
  },
  {
    name: "annapurna-base-camp-snow",
    folder: "annapurna",
    commons: "File:Annapurna Base Camp with snow.jpg",
    alt: "Fresh snow over the lodges at Annapurna Base Camp",
    caption: "Annapurna Base Camp after snowfall",
  },
  {
    name: "thorong-la",
    folder: "annapurna",
    commons: "File:Thorong La Pass.jpg",
    alt: "Prayer flags and a cairn on the Thorong La at 5,416 metres",
    caption: "The Thorong La, 5,416 m",
  },
  {
    name: "rhododendron-forest",
    folder: "annapurna",
    commons: "File:Rododendron Forest and Trekkers.jpg",
    alt: "Trekkers walking a path through flowering rhododendron forest",
    caption: "Rhododendron forest on the Annapurna trail",
  },
  {
    name: "phewa-lake",
    folder: "annapurna",
    commons: "File:Phewa Lake in Pokhara, Nepal.jpg",
    alt: "Machhapuchhre reflected in the still water of Phewa Lake",
    caption: "Phewa Lake, Pokhara",
  },
  {
    name: "phewa-lake-sunset",
    folder: "annapurna",
    commons: "File:Sun Set over Phewa Lake.jpg",
    alt: "Sunset over Phewa Lake with boats moored along the shore",
    caption: "Sunset over Phewa Lake",
  },

  /* -------------------------------------------------------------- langtang */
  {
    name: "kyanjin-gompa",
    folder: "langtang",
    commons: "File:Kyanjin Gompa Village Rasuwa.jpg",
    alt: "The stone houses of Kyanjin Gompa on the valley floor at 3,850 metres",
    caption: "Kyanjin Gompa, 3,850 m",
  },
  {
    name: "gangchempo",
    folder: "langtang",
    commons: "File:Mt. Gangchempo 6387 m- Kyanjin Gompa Lantang Valley-IMG 2731.jpg",
    alt: "The pyramid of Gangchempo at the head of the Langtang valley",
    caption: "Gangchempo, 6,387 m, from Kyanjin Gompa",
  },
  {
    name: "kyanjin-snowfall",
    folder: "langtang",
    commons: "File:Snow-capped Mountains at Kyanjin Gompa Rasuwa.jpg",
    alt: "Snow-capped peaks above Kyanjin Gompa after a fall of snow",
    caption: "Snowfall above Kyanjin Gompa",
  },

  /* --------------------------------------------------------------- mustang */
  {
    name: "lo-manthang",
    folder: "mustang",
    commons: "File:Mustang-Lo Manthang-14-Dachausflug-2015-gje.jpg",
    alt: "The flat rooftops of the walled town of Lo Manthang",
    caption: "Lo Manthang, capital of Upper Mustang",
  },
  {
    name: "mustang-trail",
    folder: "mustang",
    commons: "File:Mustang-Lo Gekar to Lo Manthang-17-2015-gje.jpg",
    alt: "An eroded desert trail crossing the high plateau towards Lo Manthang",
    caption: "The trail from Lo Gekar to Lo Manthang",
  },
  {
    name: "muktinath-valley",
    folder: "mustang",
    commons: "File:Muktinath Valley, View of Thorong La Pass, Mountains, Nepal.jpg",
    alt: "The Muktinath valley looking back towards the Thorong La",
    caption: "Muktinath valley, looking to the Thorong La",
  },

  /* ------------------------------------------------------------- kathmandu */
  {
    name: "boudhanath-stupa",
    folder: "kathmandu",
    commons: "File:Boudhanath Stupa-IMG 7048.jpg",
    alt: "The white dome and painted eyes of Boudhanath stupa",
    caption: "Boudhanath stupa, Kathmandu",
  },
  {
    name: "kathmandu-durbar-square",
    folder: "kathmandu",
    commons: "File:Kathmandu Durbar Square, Basantapur.jpg",
    alt: "Tiered temple roofs around Kathmandu Durbar Square",
    caption: "Kathmandu Durbar Square, Basantapur",
  },

  /* ------------------------------------------------------------ activities */
  {
    name: "chitwan-rhino",
    folder: "activities",
    commons: "File:Greater one-horned rhinoceros at Chitwan.jpg",
    alt: "A greater one-horned rhinoceros and calf in grassland at Chitwan",
    caption: "Greater one-horned rhinoceros, Chitwan National Park",
  },
  {
    name: "trishuli-rafting",
    folder: "activities",
    commons: "File:Trishuli River Rafting, Nepal-3119.jpg",
    alt: "A raft dropping through white water on the Trishuli river",
    caption: "Rafting the Trishuli",
  },
];
