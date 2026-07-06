# PissMap NOLA — Partner Playbook

How to sign the first venues onto the partner tier. Partners get a gold
**PARTNER** ribbon on their spot card, a deal line ("Show this app for $1 off"),
their own QR sticker, and a slot on the `/partners` page. At launch it's **free**
— you're buying proof, not revenue.

> The full pitch one-pager already lives in-app at **`/partners/pitch`** (print
> it). This doc is the outreach *process* around it.

---

## The offer (launch special)

- **Cost:** $0. Free for every venue that signs on before the model is proven.
- **They get:** the gold PARTNER ribbon + a custom deal line on their pin, a
  QR sticker that scans straight to their spot, and a listing on `/partners`.
- **They give:** permission to display the ribbon, and (optionally) a small
  perk for app users — a dollar off, a free refill, "restroom's yours, no
  purchase needed after 10pm," whatever fits.
- **No promises of traffic numbers.** We show scans in `/admin`; we don't
  invent ROI. Honesty is the whole brand.

To actually turn a venue into a partner: add `partner: { deal: "…" }` to its
entry in `lib/spots/`, then redeploy. (One-line dataset edit — see the pitch
page.)

---

## Outreach script (in person, ~30 seconds)

> "Hey — I run PissMap, a free map of clean, welcoming restrooms across New
> Orleans. It's got 412 spots and a good chunk of foot traffic looking for
> exactly your kind of place. You're already *on* it. I'd love to make you a
> launch partner — free — which puts a little gold badge on your spot and lets
> you offer app users a small perk if you want. Costs you nothing, sends people
> through your door already in a buying mood. Can I text you the one-pager?"

Then send the `/partners/pitch` link (once the domain is live) or hand them a
printed copy.

---

## FAQ — objections & answers

**"Is this going to cost me anything?"**
Nothing at launch. If it ever becomes paid, you'll be grandfathered or given
plenty of notice — no surprise invoices.

**"What do I actually have to do?"**
Let people use the restroom, and honor whatever small perk you pick (or pick
none). That's it. No POS integration, no app to install, no contract.

**"I don't want a line of people who don't buy anything."**
Totally fair — that's why *you* set the deal. Most partners tie the perk to a
cheap purchase ("$1 off any drink"), which turns a bathroom run into a sale.

**"How do I know it's driving anyone in?"**
Every QR scan is counted; you can ask for your spot's scan numbers anytime. No
inflated dashboards — just the real count.

**"What if my hours change / I move?"**
Tell us, or let a customer flag it in-app — we patch the map the same day,
no redeploy wait.

**"Who's behind this?"**
An independent local project. Not the city, not a chain, no venture money. Just
a better map than the one that doesn't exist.

---

## Tracking table

Copy this into a sheet. One row per venue you approach.

| Venue | Neighborhood | Contact | Date pitched | Status | Deal offered | Scans (from /admin) | Notes |
|---|---|---|---|---|---|---|---|
| _e.g._ Clover Grill | French Quarter | manager | | pitched / signed / declined | $1 off coffee | | 24/7 anchor |
| | | | | | | | |
| | | | | | | | |

Statuses: **lead → pitched → signed → live → churned.** Keep it dead simple.

---

## ⚠️ Before the first paid or bartered deal

**Upgrade Vercel from Hobby to Pro.** The Hobby tier is non-commercial — the
moment money or barter changes hands for a partner slot, you need Pro. Do it
*before* you close the first deal, not after. (It's also where you get the
headroom for real traffic.)

Also: only print/distribute partner QR stickers after the domain is live and
`npm run preflight https://<domain>` says **LAUNCH READY** — otherwise the codes
point at a placeholder URL.
