const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// PRODUCT IMAGES
// This is the ONLY place image URLs live. Change a URL here,
// re-run `npm run prisma:seed`, and it updates everywhere on the
// site — cards, detail pages, cart, search results.
//
// To use local images instead of hotlinked URLs (recommended for
// a portfolio project): drop the files into `public/images/` and
// write the path as "/images/your-file.jpg".
// ─────────────────────────────────────────────────────────────

const products = [
  {
    slug: "ember-01-desk-lamp",
    name: "Ember 01 Desk Lamp",
    description:
      "A single-arm task lamp machined from anodized aluminum, with a warm 2700K diffuser designed to be the last light on at night. Three-step touch dimming, no cold white setting — only shades of amber.",
    price: 189.0,
    category: "Lighting",
    stock: 34,
    rating: 4.8,
    featured: true,
    isNew: false,
    specs: { Material: "Anodized aluminum", "Light temp": "2700K warm", Cable: "1.8m braided", Weight: "1.1kg" },
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSH_lm81PAkLfnfs5DTadjsj9bcr3L10AIdv8UOx98-Fg&s=10",
  },
  {
    slug: "aiden-glass-carafe",
    name: "Aiden Glass Carafe & Warmer",
    description:
      "Borosilicate carafe on a low-heat walnut cradle, built for the slow second pour after everyone else has gone to bed. Holds heat for forty minutes without scorching.",
    price: 96.0,
    category: "Home",
    stock: 21,
    rating: 4.6,
    featured: false,
    isNew: true,
    specs: { Capacity: "1.0L", Base: "Walnut, low-heat", Care: "Hand wash" },
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRE8pBfUUsJuDS1ErSPr4hQ4by7OjcPU2V8ph0pkmeK_A&s=10",
  },
  {
    slug: "field-40-backpack",
    name: "Field 40 Travel Pack",
    description:
      "A 40-litre carry-on built from waxed canvas and vegetable-tanned leather trim, with a padded 16-inch laptop sleeve and a compression system that keeps its shape half-full or full.",
    price: 245.0,
    category: "Travel",
    stock: 18,
    rating: 4.9,
    featured: true,
    isNew: false,
    specs: { Capacity: "40L", Laptop: "Up to 16-inch", Shell: "Waxed canvas" },
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-NUcD2Dp869WH5Cp3yFZGNdbHkhegHHCP_x54AB6AgrFrvCA-q2dh9PGq&s=10",
  },
  {
    slug: "duskline-earbuds",
    name: "Duskline Earbuds",
    description:
      "True-wireless earbuds tuned for low-volume, late-night listening — a warmer midrange, gentler treble, and a case that charges fully from a single desk-lamp-length nap.",
    price: 159.0,
    category: "Audio",
    stock: 46,
    rating: 4.5,
    featured: true,
    isNew: true,
    specs: { Battery: "7h + 21h case", Driver: "10mm dynamic", "Water rating": "IPX4" },
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcStr5BUNKf7piM1rsIIjlbqjyNgJlLxYcJmSpdlocV_TA&s=10",
  },
  {
    slug: "solace-weighted-blanket",
    name: "Solace Weighted Throw",
    description:
      "A 3kg cotton-cased throw filled with glass microbeads, sized for a reading chair rather than a bed. Sewn in eight quilted channels so the weight never pools.",
    price: 129.0,
    category: "Home",
    stock: 27,
    rating: 4.7,
    featured: false,
    isNew: false,
    specs: { Weight: "3kg", Shell: "Brushed cotton", Fill: "Glass microbead" },
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRnl9NSE59MegupHb98fZXz06cf-3F8_Pemj0_Yojmx9A&s=10",
  },
  {
    slug: "keystone-mechanical-keyboard",
    name: "Keystone 65 Keyboard",
    description:
      "A 65% mechanical keyboard in a milled aluminum case with a gasket-mounted plate for a deep, quiet keystroke — built for typing after the house has gone silent.",
    price: 219.0,
    category: "Tech",
    stock: 15,
    rating: 4.8,
    featured: true,
    isNew: false,
    specs: { Layout: "65%", Switches: "Hot-swap linear", Connection: "USB-C / Bluetooth" },
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMRA6LtA1H8pVjSti-lmWwGZ19Cy8chLWVnrxW0lSDbg&s=10",
  },
  {
    slug: "harbor-leather-wallet",
    name: "Harbor Card Wallet",
    description:
      "A four-pocket card wallet in vegetable-tanned leather that darkens with use. Cut from a single piece, hand-stitched, no glue.",
    price: 68.0,
    category: "Accessories",
    stock: 52,
    rating: 4.4,
    featured: false,
    isNew: false,
    specs: { Material: "Full-grain leather", Capacity: "Up to 8 cards", Origin: "Hand-stitched" },
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQVxDVEcywTqibu0P1Ty2LlVgrJJqtBpjEzO6juvCrZ6Q&s=10",
  },
  {
    slug: "nocturne-scent-diffuser",
    name: "Low Tide Diffuser",
    description:
      "An ultrasonic diffuser housed in matte ceramic, with a light sensor that dims its indicator to nothing once the room goes dark. Ships with a 100ml bottle of Low Tide, our cedar-and-salt blend.",
    price: 78.0,
    category: "Home",
    stock: 40,
    rating: 4.3,
    featured: false,
    isNew: true,
    specs: { Runtime: "Up to 8h", Tank: "150ml", Includes: "100ml Low Tide oil" },
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR3oVKeDdvN7szF9e_euBzC6QWhC7FYeiXUKeXHpxMoWg&s=10",
  },
  {
    slug: "compass-travel-organizer",
    name: "Compass Tech Organizer",
    description:
      "A fold-flat pouch with elasticated channels for cables, an SD card sleeve, and a padded pocket for a battery pack — the one thing in the bag you always know the location of.",
    price: 54.0,
    category: "Travel",
    stock: 60,
    rating: 4.5,
    featured: false,
    isNew: false,
    specs: { Material: "Ripstop nylon", Closure: "YKK zip", Weight: "140g" },
    image: "https://isomarsshop.in/cdn/shop/files/isomars-technical-compass-set-set-of-8-items-for-engineers-and-architects-2970873.jpg?v=1787381951&width=1214",
  },
  {
    slug: "meridian-record-player",
    name: "Meridian Turntable",
    description:
      "A belt-drive turntable with a built-in phono preamp and a walnut plinth, tuned to run slightly warmer than clinical — a machine for one record at a time, not a party.",
    price: 349.0,
    category: "Audio",
    stock: 9,
    rating: 4.9,
    featured: true,
    isNew: false,
    specs: { Drive: "Belt", Speeds: "33⅓ / 45 RPM", Preamp: "Built-in" },
    image: "https://www.monoandstereo.com/wp-content/uploads/2024/11/wilson_benesch_gmt_%C2%AE_one_system_prime_meridian_system_review_matej_isak_mono_and_stereo_2024_high_end_audiophile_luxury_audio_music_00003.jpg",
  },
  {
    slug: "amber-reading-glasses",
    name: "Amber Filter Reading Glasses",
    description:
      "Blue-light filtering lenses in a lightweight titanium frame, cut to a slightly warmer tint than most so screens stop fighting the lamp on your desk.",
    price: 89.0,
    category: "Accessories",
    stock: 33,
    rating: 4.2,
    featured: false,
    isNew: true,
    specs: { Frame: "Titanium", Lens: "Amber-filter", Case: "Included" },
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTIrf5qbh9A2qO_qeYNcvGrsvgmjahx1v3e2voZUD9giw&s=10",
  },
  {
    slug: "harborwatch-analog",
    name: "Harborwatch Analog",
    description:
      "A 38mm automatic watch with a sandblasted case and a dial the color of a night sky just after sunset. No date window, no chronograph — just the time.",
    price: 410.0,
    category: "Accessories",
    stock: 12,
    rating: 4.7,
    featured: true,
    isNew: false,
    specs: { Movement: "Automatic", Case: "38mm sandblasted steel", "Water resistance": "50m" },
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_Mm4iJN7aosSQQRtAVgY8dj-IxHwPlIXjEp4kRM9WAQ&s=10",
  },
  {
    slug: "low-glow-nightstand-lamp",
    name: "Low Glow Nightstand Lamp",
    description:
      "A touch-dim nightstand lamp with a dust-glass shade that never reads brighter than candlelight, even at its highest setting.",
    price: 64.0,
    category: "Lighting",
    stock: 48,
    rating: 4.4,
    featured: false,
    isNew: false,
    specs: { "Light temp": "2200K", Control: "Touch dim", Shade: "Dust glass" },
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZpaZGJuy9N6JMU9xR-mPeL6flbGNjYlDQfs-idFbDYw&s=10",
  },
  {
    slug: "voyage-packing-cubes",
    name: "Voyage Packing Cube Set",
    description:
      "A set of four compression cubes in recycled ripstop, color-coded by size so you stop unpacking the whole bag to find one shirt.",
    price: 45.0,
    category: "Travel",
    stock: 70,
    rating: 4.3,
    featured: false,
    isNew: false,
    specs: { "Set size": "4 cubes", Material: "Recycled ripstop", Compression: "Dual-zip" },
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMS8rqCJRRqToLg1cPn7aUt_3Dr1_Rl3XJm74fwkOn3w&s=10",
  },
  {
    slug: "still-life-speaker",
    name: "Still Life Tabletop Speaker",
    description:
      "A single full-range driver in a hand-turned ash enclosure. Bluetooth 5.2, one knob, no app required — built to sound good at low volumes, which is when most people actually listen.",
    price: 175.0,
    category: "Audio",
    stock: 24,
    rating: 4.6,
    featured: true,
    isNew: true,
    specs: { Connection: "Bluetooth 5.2", Enclosure: "Solid ash", Battery: "10h" },
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRh10ckXTDvKnm9z7qIMEYGxn4djs1qnntkqWcOLwcGCw&s=10",
  },
  {
    slug: "penumbra-desk-mat",
    name: "Penumbra Desk Mat",
    description:
      "A vegetable-tanned leather desk mat that develops a patina with wear, sized to hold a keyboard, a mouse, and nothing else.",
    price: 58.0,
    category: "Tech",
    stock: 44,
    rating: 4.5,
    featured: false,
    isNew: false,
    specs: { Size: "80 × 30cm", Material: "Vegetable-tanned leather", Base: "Non-slip cork" },
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTfiX--joMCX93k5E5TNPECSY_KHVCaHNkSIJLKx0YnPg&s=10",
  },
  {
    slug: "afterhours-candle",
    name: "After Hours Candle",
    description:
      "A coconut-wax candle poured in a reusable smoked-glass vessel, burning at cedar, leather, and a trace of tobacco leaf for around 60 hours.",
    price: 38.0,
    category: "Home",
    stock: 65,
    rating: 4.4,
    featured: false,
    isNew: true,
    specs: { "Burn time": "~60h", Wax: "Coconut blend", Vessel: "Reusable smoked glass" },
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRkSbBIFWeA2vYaqVHz-lbHKRvGE5jvZ-TeuHTmVBBQZA&s=10",
  },
  {
    slug: "transit-power-bank",
    name: "Transit 10K Power Bank",
    description:
      "A pocketable 10,000mAh power bank with a matte-soft finish and a single amber charge indicator instead of a row of harsh LEDs.",
    price: 49.0,
    category: "Tech",
    stock: 58,
    rating: 4.3,
    featured: false,
    isNew: false,
    specs: { Capacity: "10,000mAh", Output: "USB-C PD 20W", Weight: "195g" },
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ51sXo6DeEDkrYZdvB9JTC24W8OTqjXjnB0L_jpY1xfA&s=10",
  },
];

async function main() {
  console.log("Seeding official Nocturne Studio seller account…");
  const officialPasswordHash = await bcrypt.hash("Password123!", 12);
  const officialSeller = await prisma.user.upsert({
    where: { email: "studio@nocturne.studio" },
    update: {},
    create: {
      name: "Nocturne Studio",
      email: "studio@nocturne.studio",
      password: officialPasswordHash,
      role: "SELLER",
      businessName: "Nocturne Studio",
    },
  });

  console.log("Seeding demo customer account…");
  const demoPasswordHash = await bcrypt.hash("Password123!", 12);
  await prisma.user.upsert({
    where: { email: "demo@nocturne.studio" },
    update: {},
    create: {
      name: "Demo Shopper",
      email: "demo@nocturne.studio",
      password: demoPasswordHash,
      role: "CUSTOMER",
    },
  });

  console.log("Seeding a second demo seller (to show multi-vendor working)…");
  const secondSellerHash = await bcrypt.hash("Password123!", 12);
  const secondSeller = await prisma.user.upsert({
    where: { email: "seller@nocturne.studio" },
    update: {},
    create: {
      name: "Aria Whitfield",
      email: "seller@nocturne.studio",
      password: secondSellerHash,
      role: "SELLER",
      businessName: "Aria & Co.",
    },
  });

  const secondSellerProducts = [
    {
      slug: "aria-ceramic-mug-set",
      name: "Handthrown Ceramic Mug Set",
      description:
        "A set of two stoneware mugs, each one thrown and glazed by hand, so no two sets match exactly. Fired to be dishwasher and microwave safe despite the handmade finish.",
      price: 42.0,
      category: "Home",
      stock: 22,
      rating: 4.6,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRiFpuNJEgJbSLGIUS6ORqxbiktxBle8tFmc3ralOdkDMx9C50TW2IbhbQ&s=10",
    },
    {
      slug: "aria-linen-runner",
      name: "Washed Linen Table Runner",
      description:
        "Stonewashed European linen in a soft charcoal, pre-shrunk and finished with a simple mitred hem. Softens with every wash.",
      price: 36.0,
      category: "Home",
      stock: 30,
      rating: 4.5,
      image: "https://assets.wsimgs.com/wsimgs/rk/images/dp/wcm/202617/0110/italian-washed-linen-table-runner-o.jpg",
    },
  ];

  for (const p of secondSellerProducts) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      // Same fix as the main catalog: refresh name/price/image on every
      // re-seed instead of leaving existing rows untouched, but leave
      // `stock` alone so it doesn't undo real orders already placed.
      update: {
        name: p.name,
        description: p.description,
        price: p.price,
        image: p.image,
        gallery: JSON.stringify([p.image]),
        category: p.category,
      },
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        price: p.price,
        image: p.image,
        gallery: JSON.stringify([p.image]),
        category: p.category,
        specs: JSON.stringify({}),
        stock: p.stock,
        rating: p.rating,
        featured: false,
        isNew: true,
        sellerId: secondSeller.id,
      },
    });
  }

  console.log(`Seeding ${products.length} products…`);

  for (const p of products) {
    // Only one photo per product for now, so the gallery holds just it.
    // Add more URLs to this array for extra thumbnails on the detail page.
    const gallery = JSON.stringify([p.image]);

    const data = {
      slug: p.slug,
      name: p.name,
      description: p.description,
      price: p.price,
      image: p.image,
      gallery,
      category: p.category,
      specs: JSON.stringify(p.specs),
      stock: p.stock,
      rating: p.rating,
      featured: p.featured,
      isNew: p.isNew,
      sellerId: officialSeller.id,
    };

    await prisma.product.upsert({
      where: { slug: p.slug },
      // Refresh the catalog copy and imagery on every re-seed, but leave
      // `stock` alone so re-seeding doesn't silently undo real orders
      // that have already decremented it.
      update: {
        name: data.name,
        description: data.description,
        price: data.price,
        image: data.image,
        gallery: data.gallery,
        category: data.category,
        specs: data.specs,
        rating: data.rating,
        featured: data.featured,
        isNew: data.isNew,
      },
      create: data,
    });
  }

  console.log("Seeding demo reviewer accounts and reviews…");
  const reviewerProfiles = [
    { name: "Priya Nandakumar", email: "priya.reviews@nocturne.studio" },
    { name: "Marcus Webb", email: "marcus.reviews@nocturne.studio" },
    { name: "Elena Fischer", email: "elena.reviews@nocturne.studio" },
    { name: "Tomas Reyes", email: "tomas.reviews@nocturne.studio" },
    { name: "Hana Kobayashi", email: "hana.reviews@nocturne.studio" },
    { name: "Callum Ashford", email: "callum.reviews@nocturne.studio" },
  ];
  const reviewerHash = await bcrypt.hash("Password123!", 12);
  const reviewers = [];
  for (const r of reviewerProfiles) {
    const user = await prisma.user.upsert({
      where: { email: r.email },
      update: {},
      create: { name: r.name, email: r.email, password: reviewerHash, role: "CUSTOMER" },
    });
    reviewers.push(user);
  }

  const commentBank = [
    "Better than I expected for the price — using it daily now.",
    "Solid build quality. Took a star off only because shipping took a while.",
    "Exactly as described. Would buy again.",
    "Looks even better in person than in the photos.",
    "Does the job well, nothing fancy, but that's what I wanted.",
    "A few weeks in and still holding up nicely.",
    "Great gift — the person I gave it to loved it.",
    "Good value, though I wish it came in more colors.",
    "Works perfectly, easy to set up out of the box.",
    "Not bad, but I've seen similar quality for less elsewhere.",
    "This is my second one — bought a spare because the first held up so well.",
    "Simple, well made, does exactly what it says.",
  ];

  const allProducts = await prisma.product.findMany({ select: { id: true } });

  for (let i = 0; i < allProducts.length; i++) {
    const productId = allProducts[i].id;
    // Three reviewers per product, rotated so re-running the seed is
    // idempotent (same pairing every time) rather than piling up random
    // combinations on every run.
    for (let j = 0; j < 3; j++) {
      const reviewer = reviewers[(i + j) % reviewers.length];
      const rating = [5, 4, 5, 4, 3][(i + j) % 5]; // skews positive, like real review data
      const comment = commentBank[(i * 3 + j) % commentBank.length];

      await prisma.review.upsert({
        where: { productId_userId: { productId, userId: reviewer.id } },
        update: {},
        create: { productId, userId: reviewer.id, rating, comment },
      });
    }

    const agg = await prisma.review.aggregate({ where: { productId }, _avg: { rating: true } });
    await prisma.product.update({
      where: { id: productId },
      data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10 },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
