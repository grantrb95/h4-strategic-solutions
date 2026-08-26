import json, os

OUT = "/home/claude/h4-site-build"
BASE_URL = "https://www.h-4ss.com"
PHONE_DISPLAY = "(918) 869-5241"
PHONE_TEL = "+19188695241"
ADDRESS = {
    "@type": "PostalAddress",
    "streetAddress": "607 SE Railroad St",
    "addressLocality": "Fort Gibson",
    "addressRegion": "OK",
    "postalCode": "74434",
    "addressCountry": "US",
}
STATES = ["Oklahoma", "Texas", "Colorado", "Kansas", "Missouri", "Arkansas"]

NAV = [
    ("Home", f"{BASE_URL}/"),
    ("Services", f"{BASE_URL}/#services"),
    ("About", f"{BASE_URL}/#about"),
    ("Coverage", f"{BASE_URL}/coverage-area"),
    ("Contact", f"{BASE_URL}/#contact"),
]

ALL_PAGES = {
    "oilfield-emergency-hauling": "Oilfield Emergency Services",
    "construction-equipment-hauling": "Construction Equipment Hauling",
    "aerospace-manufacturing-freight": "Aerospace Manufacturing Support",
    "equipment-rental-logistics": "Equipment Rental Logistics",
    "coverage-area": "Coverage Area",
}


def provider_org():
    return {
        "@type": "LocalBusiness",
        "name": "H-4 Strategic Solutions",
        "telephone": PHONE_TEL,
        "address": ADDRESS,
        "url": BASE_URL + "/",
    }


def area_served():
    return [{"@type": "Country", "name": "United States"}] + [
        {"@type": "State", "name": s} for s in STATES
    ]


def render_head(slug, title, description):
    url = f"{BASE_URL}/{slug}"
    return f"""<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{url}">
<meta property="og:site_name" content="H-4 Strategic Solutions">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{description}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
"""


def render_header(active_slug):
    links = []
    for label, href in NAV:
        links.append(f'<a href="{href}">{label}</a>')
    return f"""<header class="site-header">
  <a class="brand" href="{BASE_URL}/">
    <span class="badge">H-4</span>
    <span class="name">H-4 Strategic Solutions</span>
  </a>
  <nav class="main-nav">
    {''.join(links)}
  </nav>
  <a class="btn btn-primary" href="{BASE_URL}/#contact">Get a Quote</a>
</header>
"""


def render_crumb(current_label, slug):
    return f"""<div class="wrap crumb" style="padding-top:20px;">
  <a href="{BASE_URL}/">Home</a> &nbsp;/&nbsp; <span>{current_label}</span>
</div>
"""


def render_related(exclude_slug):
    items = []
    for slug, label in ALL_PAGES.items():
        if slug == exclude_slug:
            continue
        items.append(
            f'<a href="{BASE_URL}/{slug}"><span class="rel-label">{label}</span>See details &rarr;</a>'
        )
    return f"""<section class="section-border">
  <div class="eyebrow">Related</div>
  <h2 style="font-size:26px;">Explore more of H-4</h2>
  <div class="related">{''.join(items)}</div>
</section>
"""


def render_footer():
    return f"""<footer class="site-footer">
  <div>H-4 Strategic Solutions &middot; Fort Gibson, Oklahoma &middot;
    <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a>
  </div>
  <div style="margin-top:8px;">Nationwide operating authority &middot; Primary lanes: {', '.join(STATES)}</div>
</footer>
"""


def render_faq_schema(faqs):
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {"@type": "Answer", "text": a},
            }
            for q, a in faqs
        ],
    }


def render_faq_html(faqs):
    items = "".join(
        f'<div class="faq-item"><h3>{q}</h3><p>{a}</p></div>' for q, a in faqs
    )
    return f"""<section class="section-border">
  <div class="eyebrow">Frequently Asked</div>
  <h2 style="font-size:26px;">Common questions</h2>
  {items}
</section>
"""


def render_stats(stats):
    cells = "".join(
        f'<div class="stat"><div class="num">{n}</div><div class="label">{l}</div></div>'
        for n, l in stats
    )
    return f'<div class="stat-row">{cells}</div>'


def render_scenario(eyebrow, heading, text):
    if not text:
        return ""
    return f"""<section class="section-border">
  <div class="eyebrow">{eyebrow}</div>
  <h2 style="font-size:26px;">{heading}</h2>
  <div class="scenario-box"><p>{text}</p></div>
</section>
"""


def render_hero_ctas(call_first):
    quote_btn = f'<a class="btn {"btn-outline" if call_first else "btn-primary"}" href="{BASE_URL}/#contact">Request a Quote</a>'
    call_btn = f'<a class="btn {"btn-primary" if call_first else "btn-outline"}" href="tel:{PHONE_TEL}">Call {PHONE_DISPLAY}</a>'
    btns = [call_btn, quote_btn] if call_first else [quote_btn, call_btn]
    return f'<div style="margin-top:28px; display:flex; gap:14px;">{"".join(btns)}</div>'


def render_cta_band(call_first, cta_body=None):
    if call_first:
        heading = "Get a same-day answer"
        body = cta_body or "For an active emergency, call dispatch directly &mdash; it&rsquo;s the fastest way to get a straight answer on capacity and timing."
        buttons = (
            f'<a class="btn btn-primary" href="tel:{PHONE_TEL}">Call {PHONE_DISPLAY}</a>'
            f'<a class="btn btn-outline" href="{BASE_URL}/#contact">Request a Quote</a>'
        )
        buttons_html = f'<div style="display:flex; gap:14px; justify-content:center; flex-wrap:wrap;">{buttons}</div>'
    else:
        heading = "Request a same-day quote"
        body = "Tell us the load and the timeline &mdash; H-4 dispatch confirms capacity the same day."
        buttons_html = f'<a class="btn btn-primary" href="{BASE_URL}/#contact">Request a Quote</a>'
    return f"""<div class="cta-band">
    <div class="eyebrow" style="justify-content:center;">Ready to move?</div>
    <h2 style="font-size:30px;">{heading}</h2>
    <p style="margin:0 auto;">{body}</p>
    {buttons_html}
  </div>
"""


def page(slug, title, description, eyebrow, h1_html, lede, body_paragraphs, stats, faqs, service_type, extra_schema=None, persona=None, scenario_eyebrow=None, scenario_heading=None, scenario_text=None, call_first=False, cta_body=None):
    breadcrumb_schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{BASE_URL}/"},
            {"@type": "ListItem", "position": 2, "name": ALL_PAGES[slug], "item": f"{BASE_URL}/{slug}"},
        ],
    }
    service_schema = {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": service_type,
        "provider": provider_org(),
        "areaServed": area_served(),
        "description": description,
        "url": f"{BASE_URL}/{slug}",
    }
    schemas = [service_schema, render_faq_schema(faqs), breadcrumb_schema]
    if extra_schema:
        schemas.append(extra_schema)
    schema_tags = "\n".join(
        f'<script type="application/ld+json">{json.dumps(s)}</script>' for s in schemas
    )

    body = "".join(f"<p>{p}</p>" for p in body_paragraphs)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
{render_head(slug, title, description)}
{schema_tags}
</head>
<body>
{render_header(slug)}
<main>
  {render_crumb(ALL_PAGES[slug], slug)}
  <div class="hero">
    <div class="eyebrow">{eyebrow}</div>
    <h1>{h1_html}</h1>
    <p class="lede">{lede}</p>
    {render_hero_ctas(call_first)}
    {f'<div class="persona-tag">Built for: <span class="accent">{persona}</span></div>' if persona else ''}
    {render_stats(stats)}
  </div>
  <section class="section-border">
    {body}
  </section>
  {render_scenario(scenario_eyebrow, scenario_heading, scenario_text)}
  {render_faq_html(faqs)}
  {render_related(slug)}
  {render_cta_band(call_first, cta_body)}
</main>
{render_footer()}
</body>
</html>
"""
    with open(os.path.join(OUT, f"{slug}.html"), "w") as f:
        f.write(html)


# ---------------------------------------------------------------------------
# 1. Oilfield Emergency Services
# ---------------------------------------------------------------------------
page(
    slug="oilfield-emergency-hauling",
    title="Oilfield Emergency Hauling | Same-Day Hotshot Freight | H-4 Strategic Solutions",
    description="Emergency oilfield equipment hauling with nationwide operating authority and primary lanes across Oklahoma, Texas, Colorado, Kansas, Missouri, and Arkansas. Same-day quotes, air-ride gooseneck, 22,500 lb payload.",
    eyebrow="Oilfield Emergency Services",
    h1_html='When A Rig Is Down, <span class="accent">Freight Can&rsquo;t Wait.</span>',
    lede="H-4 Strategic Solutions accepts urgent and after-hours oilfield loads for failed parts, equipment swaps, and other time-sensitive moves. Pickup timing is confirmed directly based on truck position, current commitments, loading requirements, and the driver&rsquo;s available hours of service.",
    body_paragraphs=[
        "Oilfield operations do not always fit normal business hours. H-4 Strategic Solutions is based in Fort Gibson, Oklahoma, and holds nationwide operating authority, with primary lane density across Oklahoma, Texas, Colorado, Kansas, Missouri, and Arkansas.",
        "Our air-ride 40-ft gooseneck carries up to 22,500 lb payload, enough for wellhead equipment, pump components, and similar oilfield support machinery. Every quote request gets a straight answer the same day &mdash; capacity, pricing, and timing based on where the truck is and what&rsquo;s already on the schedule.",
        "If you&rsquo;re coordinating logistics for a rig site, service company, or operator, call H-4 directly. After-hours requests are accepted, and dispatch will confirm capacity, pricing, and the earliest available pickup window based on the truck&rsquo;s current position, schedule, loading requirements, and remaining legal hours of service.",
    ],
    stats=[("22,500 LB", "Max Payload"), ("40-FT", "Air-Ride Gooseneck"), ("AFTER-HOURS", "Requests Accepted")],
    faqs=[
        ("How fast can H-4 respond to an oilfield emergency load?", "H-4 accepts urgent and after-hours requests. Dispatch confirms capacity and timing based on the truck&rsquo;s current position, existing commitments, loading requirements, and remaining legal hours of service. Same-day pickup may be available but is not guaranteed."),
        ("What states does H-4 serve for oilfield freight?", "H-4 holds nationwide operating authority. Primary lane density and fastest response times are in the core corridor: Oklahoma, Texas, Colorado, Kansas, Missouri, and Arkansas."),
        ("What can H-4's equipment haul?", "An air-ride 40-ft gooseneck rated to 22,500 lb payload, suited to wellhead equipment, pump components, and oilfield support machinery within that weight range."),
        ("How do I request an emergency quote?", "Call (918) 869-5241 for the fastest response, or submit a request through the website &mdash; dispatch will follow up the same day with capacity and pricing."),
    ],
    service_type="Oilfield Emergency Equipment Hauling",
    persona="Rig Site Coordinators &amp; Company Men",
    scenario_eyebrow="On The Ground",
    scenario_heading="A typical emergency call",
    scenario_text="It&rsquo;s rarely a scheduled pickup. A gasket fails on a Friday night, a rig needs a replacement pump before the next shift change, or equipment has to clear a location before a well control window closes. H&#8209;4 dispatch takes the call, checks current truck position and what&rsquo;s already on the schedule, and gives a straight same-day answer on whether &mdash; and when &mdash; we can take it.",
    call_first=True,
    cta_body="Call with the load details and timeline. H-4 will confirm availability, pricing, and the earliest compliant pickup window.",
)

# ---------------------------------------------------------------------------
# 2. Construction Equipment Hauling
# ---------------------------------------------------------------------------
page(
    slug="construction-equipment-hauling",
    title="Construction Equipment Hauling | Hotshot Flatbed Freight | H-4 Strategic Solutions",
    description="Reliable hotshot hauling for construction equipment with nationwide operating authority and primary lanes across OK, TX, CO, KS, MO, and AR. Air-ride gooseneck, 22,500 lb payload, same-day quotes.",
    eyebrow="Construction Equipment Hauling",
    h1_html='Keep The <span class="accent">Job Site Moving.</span>',
    lede="A piece of equipment sitting on a trailer waiting for transport is a job site standing still. H-4 moves construction equipment on hotshot timelines instead of standard freight schedules.",
    body_paragraphs=[
        "H-4 Strategic Solutions hauls skid steers, compact excavators, attachments, and support machinery within our payload range &mdash; on a hotshot dispatch model rather than a traditional flatbed queue, so a delayed delivery doesn&rsquo;t become a delayed project.",
        "Our air-ride 40-ft gooseneck handles up to 22,500 lb, and because we run hotshot rather than standard freight, we can typically turn a quote request into a scheduled pickup the same day. That matters most when a contractor needs equipment repositioned between sites, a rental unit needs to move fast, or a breakdown means a replacement machine has to arrive before the crew loses a day.",
        "We hold nationwide operating authority, with primary lane density across Oklahoma, Texas, Colorado, Kansas, Missouri, and Arkansas. Request a quote and we&rsquo;ll confirm capacity and timing directly.",
    ],
    stats=[("22,500 LB", "Max Payload"), ("40-FT", "Air-Ride Gooseneck"), ("SAME-DAY", "Quote Response")],
    faqs=[
        ("Can H-4 reposition equipment between job sites?", "Yes &mdash; inter-site repositioning is one of the most common construction equipment moves H-4 runs, along with rental returns and breakdown replacements."),
        ("What's the typical turnaround from quote to pickup?", "Most construction equipment quote requests get a same-day answer, and pickup is often scheduled the same day capacity is confirmed."),
        ("What equipment sizes and weights does H-4 handle?", "Up to 22,500 lb on an air-ride 40-ft gooseneck &mdash; skid steers, compact excavators, attachments, and similar support machinery."),
        ("Does H-4 serve states outside the core corridor?", "H-4 holds nationwide operating authority. The core corridor (OK/TX/CO/KS/MO/AR) is where lane density and response times are fastest, but requests outside it are welcome."),
    ],
    service_type="Construction Equipment Hauling",
    persona="General Contractors &amp; Superintendents",
    scenario_eyebrow="On The Job Site",
    scenario_heading="When the schedule can&rsquo;t slip",
    scenario_text="A skid steer goes down two days before a pour, or a rental return has to clear the yard before the next job starts. H&#8209;4 treats it like the schedule problem it actually is: get a quote in, get a pickup window confirmed, and keep the crew working instead of waiting on a trailer.",
)

# ---------------------------------------------------------------------------
# 3. Aerospace Manufacturing Support
# ---------------------------------------------------------------------------
page(
    slug="aerospace-manufacturing-freight",
    title="Aerospace Manufacturing Freight Support | H-4 Strategic Solutions",
    description="Time-critical freight support for aerospace manufacturing and supply chains, with nationwide operating authority and primary lanes across OK, TX, CO, KS, MO, and AR. Same-day quotes, dedicated hotshot capacity.",
    eyebrow="Aerospace Manufacturing Support",
    h1_html='Precision Freight For A <span class="accent">Precision Industry.</span>',
    lede="Aerospace manufacturing supply chains don&rsquo;t tolerate slack. H-4 supports manufacturers and suppliers with hotshot capacity for time-critical components, tooling, and support equipment.",
    body_paragraphs=[
        "A missed delivery window in aerospace manufacturing can hold up a production line or a certification deadline. H-4 Strategic Solutions supports aerospace manufacturers and their suppliers with hotshot freight capacity for moves that can&rsquo;t sit on a standard multi-day freight schedule.",
        "We run an air-ride 40-ft gooseneck rated to 22,500 lb, which covers the tooling and equipment moves that come up most often in aerospace manufacturing support. Because we work directly with shippers rather than routing through a broker relay, a quote request gets a same-day, specific answer &mdash; capacity, ETA, and cost &mdash; so your team can plan around a confirmed pickup instead of an estimate.",
        "H-4 holds nationwide operating authority, with primary lane density across Oklahoma, Texas, Colorado, Kansas, Missouri, and Arkansas. If your supply chain has a facility or supplier in this region or beyond, request a quote to get a direct line to dispatch.",
    ],
    stats=[("22,500 LB", "Max Payload"), ("40-FT", "Air-Ride Gooseneck"), ("SAME-DAY", "Quote Response")],
    faqs=[
        ("What kind of aerospace freight does H-4 move?", "Time-critical tooling, components, and support equipment within our 22,500 lb payload range &mdash; the moves that can't wait for a standard multi-day freight schedule."),
        ("How does H-4 handle tight production-line deadlines?", "Direct shipper-to-dispatch communication with a same-day quote response, so your team gets a confirmed pickup and ETA instead of a routed estimate."),
        ("Does H-4 work directly with suppliers, not just primes?", "Yes &mdash; H-4 works directly with aerospace manufacturers and their suppliers throughout the supply chain."),
        ("What's H-4's coverage area for aerospace freight?", "Nationwide operating authority, with the fastest response in the core corridor: Oklahoma, Texas, Colorado, Kansas, Missouri, and Arkansas."),
    ],
    service_type="Aerospace Manufacturing Freight Support",
    persona="Manufacturing &amp; Procurement Teams",
    scenario_eyebrow="Supply Chain Reality",
    scenario_heading="When a production line is waiting on one part",
    scenario_text="A supplier&rsquo;s tooling ships late, or a component has to move between facilities before a production window closes. H&#8209;4 works directly with manufacturers and their suppliers &mdash; no broker relay in between &mdash; so the people managing the deadline get a straight answer on capacity and ETA.",
)

# ---------------------------------------------------------------------------
# 4. Equipment Rental Logistics
# ---------------------------------------------------------------------------
page(
    slug="equipment-rental-logistics",
    title="Equipment Rental Logistics & Delivery | H-4 Strategic Solutions",
    description="Hotshot delivery and repositioning for equipment rental companies, with nationwide operating authority and primary lanes across OK, TX, CO, KS, MO, and AR. Same-day quotes, air-ride gooseneck, 22,500 lb payload.",
    eyebrow="Equipment Rental Logistics",
    h1_html='Turn Rental Units <span class="accent">Faster.</span>',
    lede="For a rental fleet, a unit sitting idle between customers is lost revenue. H-4 helps rental companies move equipment faster: deliveries, inter-yard repositioning, and return pickups.",
    body_paragraphs=[
        "H-4 Strategic Solutions helps equipment rental fleets keep units moving instead of waiting on transport &mdash; customer deliveries, inter-yard repositioning, and return pickups, all on a hotshot timeline rather than a standard freight schedule.",
        "Our air-ride 40-ft gooseneck handles up to 22,500 lb, and our hotshot dispatch model means a rental company can request a quote and get a same-day answer instead of waiting on standard freight. That turnaround speed is often the difference between winning a same-week rental and losing it to downtime.",
        "H-4 holds nationwide operating authority, with primary lane density across Oklahoma, Texas, Colorado, Kansas, Missouri, and Arkansas. Request a quote directly and we&rsquo;ll confirm timing the same day.",
    ],
    stats=[("22,500 LB", "Max Payload"), ("40-FT", "Air-Ride Gooseneck"), ("SAME-DAY", "Quote Response")],
    faqs=[
        ("Can H-4 handle recurring rental yard routes?", "Yes &mdash; scheduled inter-yard repositioning and recurring delivery/return routes are common work for H-4's rental logistics customers."),
        ("How quickly can H-4 move a rental unit to a customer?", "Most quote requests get a same-day answer, which is often the difference in winning a same-week rental against downtime."),
        ("What equipment does H-4 haul for rental fleets?", "Excavators, generators, compressors, and similar equipment within a 22,500 lb payload on an air-ride 40-ft gooseneck."),
        ("Does H-4 serve rental fleets outside the core states?", "H-4 holds nationwide operating authority. The core corridor (OK/TX/CO/KS/MO/AR) gets the fastest response, but H-4 serves rental logistics requests nationwide."),
    ],
    service_type="Equipment Rental Logistics",
    persona="Rental Branch &amp; Fleet Managers",
    scenario_eyebrow="Fleet Economics",
    scenario_heading="Every day in transit is a day not earning",
    scenario_text="A unit finishes a rental across town and the next customer is already waiting, or a yard needs inventory repositioned before a weekend rush. H&#8209;4 treats rental logistics like what it is &mdash; a revenue problem, not just a delivery &mdash; and works to turn a quote into a confirmed pickup the same day.",
)

print("Generated 4 vertical pages.")

# ---------------------------------------------------------------------------
# 5. Coverage Area (nationwide authority + core corridor)
# ---------------------------------------------------------------------------
STATE_ABBR = {
    "Oklahoma": "OK", "Texas": "TX", "Colorado": "CO",
    "Kansas": "KS", "Missouri": "MO", "Arkansas": "AR",
}
state_cards = "".join(
    f'<div class="stat"><div class="num">{STATE_ABBR[s]}</div><div class="label">{s}</div></div>'
    for s in STATES
)

extra_body = f"""
<section class="section-border">
  <div class="eyebrow">Primary Lane Corridor</div>
  <h2 style="font-size:26px;">Where H-4 runs most often</h2>
  <p>These six states carry the highest lane density and the fastest response times. Requests from anywhere else in H-4's nationwide operating authority are welcome &mdash; response time outside the corridor depends on current lane positioning.</p>
  <div class="stat-row" style="margin-top:20px; flex-wrap: wrap;">{state_cards}</div>
</section>
"""

place_schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "H-4 Strategic Solutions",
    "telephone": PHONE_TEL,
    "address": ADDRESS,
    "url": BASE_URL + "/coverage-area",
    "areaServed": area_served(),
}

slug = "coverage-area"
title = "Service Area | Nationwide Hotshot Freight, Core Lanes OK/TX/CO/KS/MO/AR | H-4 Strategic Solutions"
description = "H-4 Strategic Solutions holds nationwide operating authority out of Fort Gibson, Oklahoma, with primary lane density across Oklahoma, Texas, Colorado, Kansas, Missouri, and Arkansas. See coverage and request a quote."
faqs = [
    ("Does H-4 only run in six states?", "No. H-4 holds nationwide (48-state) operating authority. Oklahoma, Texas, Colorado, Kansas, Missouri, and Arkansas make up the primary corridor where lane density and response times are strongest."),
    ("Where is H-4 based?", "Fort Gibson, Oklahoma."),
    ("How fast is dispatch outside the core corridor?", "H-4 will run loads anywhere within its nationwide authority. Response time depends on current lane positioning — requests inside the core corridor typically get the fastest turnaround."),
    ("What equipment does H-4 run?", "An air-ride 40-ft gooseneck rated to 22,500 lb payload, suited to oilfield equipment, construction machinery, aerospace manufacturing support freight, and equipment rental logistics."),
]

breadcrumb_schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{BASE_URL}/"},
        {"@type": "ListItem", "position": 2, "name": "Coverage Area", "item": f"{BASE_URL}/coverage-area"},
    ],
}
schemas = [place_schema, render_faq_schema(faqs), breadcrumb_schema]
schema_tags = "\n".join(f'<script type="application/ld+json">{json.dumps(s)}</script>' for s in schemas)

body_paragraphs = [
    "H-4 Strategic Solutions is based in Fort Gibson, Oklahoma, and holds nationwide operating authority — H-4 will run hotshot flatbed freight anywhere in the lower 48 states.",
    "Lane density is concentrated in a six-state corridor: Oklahoma, Texas, Colorado, Kansas, Missouri, and Arkansas. That's where dispatch decisions stay local and response times are fastest — but it's the core of H-4's business, not the limit of it.",
    "Our equipment is an air-ride 40-ft gooseneck rated for up to 22,500 lb, suited to oilfield equipment, construction machinery, aerospace manufacturing support freight, and equipment rental logistics. Wherever your load originates or needs to land, request a quote and we'll confirm the same day.",
]
body = "".join(f"<p>{p}</p>" for p in body_paragraphs)

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
{render_head(slug, title, description)}
{schema_tags}
</head>
<body>
{render_header(slug)}
<main>
  {render_crumb('Coverage Area', slug)}
  <div class="hero">
    <div class="eyebrow">Service Area</div>
    <h1>Nationwide Authority. <span class="accent">Regional Speed.</span></h1>
    <p class="lede">Based in Fort Gibson, Oklahoma, with nationwide operating authority and a core lane corridor built for fast, local dispatch decisions.</p>
    <div style="margin-top:28px; display:flex; gap:14px;">
      <a class="btn btn-primary" href="{BASE_URL}/#contact">Request a Quote</a>
      <a class="btn btn-outline" href="tel:{PHONE_TEL}">Call {PHONE_DISPLAY}</a>
    </div>
  </div>
  <section class="section-border">
    {body}
  </section>
  {extra_body}
  {render_faq_html(faqs)}
  {render_related(slug)}
  <div class="cta-band">
    <div class="eyebrow" style="justify-content:center;">Ready to move?</div>
    <h2 style="font-size:30px;">Request a same-day quote</h2>
    <p style="margin:0 auto;">Tell us the load and the timeline &mdash; H-4 dispatch confirms capacity the same day.</p>
    <a class="btn btn-primary" href="{BASE_URL}/#contact">Request a Quote</a>
  </div>
</main>
{render_footer()}
</body>
</html>
"""
with open(os.path.join(OUT, f"{slug}.html"), "w") as f:
    f.write(html)

# ---------------------------------------------------------------------------
# sitemap.xml + robots.txt (recommended additions, deployed alongside)
# ---------------------------------------------------------------------------
urls = [f"{BASE_URL}/"] + [f"{BASE_URL}/{s}" for s in ALL_PAGES]
sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
for u in urls:
    sitemap += f"  <url><loc>{u}</loc></url>\n"
sitemap += "</urlset>\n"
with open(os.path.join(OUT, "sitemap.xml"), "w") as f:
    f.write(sitemap)

robots = f"""User-agent: *
Allow: /

Sitemap: {BASE_URL}/sitemap.xml
"""
with open(os.path.join(OUT, "robots.txt"), "w") as f:
    f.write(robots)

vercel_json = {
    "cleanUrls": True,
    "trailingSlash": False,
}
with open(os.path.join(OUT, "vercel.json"), "w") as f:
    json.dump(vercel_json, f, indent=2)

print("Generated coverage-area page, sitemap.xml, robots.txt, vercel.json.")
