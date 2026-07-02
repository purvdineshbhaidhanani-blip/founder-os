import { describe, expect, it } from "vitest";
import { classifyItem } from "../../src/problems/detector.js";
import type { ProblemCategory } from "../../src/problems/types.js";
import type { RawResearchItem } from "../../src/research/types.js";

/**
 * Large, data-driven fixture suite validating the expanded phrase coverage
 * added to the deterministic category detector (10 pattern-matched
 * categories + "other" fallback + the 3 new categories: market-gap,
 * workaround, existing-spending). Every fixture below was verified against
 * the REAL `classifyItem` output at authoring time — `expectedCategories`
 * lists categories that MUST appear (additional matches are allowed and, in
 * several deliberately overlapping cases like looking-for-alternative /
 * market-gap, expected). `mustNotMatch` lists categories that are asserted
 * to NOT appear — used only where the substring-matching design genuinely
 * avoids a plausible false positive (a "genuine guard"). Where the
 * deterministic, negation/sentiment-blind substring design produces a real
 * false positive (e.g. negated complaints, sarcasm), the fixture asserts
 * that ACTUAL behavior and documents it via `note` as a known limitation,
 * rather than pretending the system does something it cannot.
 */
interface Fixture {
  text: string;
  expectedCategories: ProblemCategory[];
  mustNotMatch?: ProblemCategory[];
  note?: string;
}

function makeItem(text: string): RawResearchItem {
  return { title: text, url: `https://example.com/${encodeURIComponent(text)}`, sourceId: "fixture" };
}

const FIXTURES: Fixture[] = [
  // ---- complaint ----
  {
    text: "This app is so frustrating to use every single day, I hate this.",
    expectedCategories: ["complaint"],
  },
  {
    text: "Honestly this is the worst software I have ever used for invoicing.",
    expectedCategories: ["complaint"],
  },
  {
    text: "This is painful, every click makes me want to scream.",
    expectedCategories: ["complaint"],
  },
  {
    text: "I hate using this dashboard, it sucks so much.",
    expectedCategories: ["complaint"],
  },
  {
    text: "The onboarding flow is awful and disappointing compared to competitors.",
    expectedCategories: ["complaint"],
  },
  {
    text: "This is such an annoying experience, I can't believe it shipped like this.",
    expectedCategories: ["complaint"],
  },
  {
    text: "The support team is terrible and never responds in time.",
    expectedCategories: ["complaint"],
  },
  {
    text: "I hate this tool, it sucks and it's frustrating beyond belief.",
    expectedCategories: ["complaint"],
  },
  {
    text: "This is genuinely the worst tool for tracking expenses I've tried.",
    expectedCategories: ["complaint"],
  },
  {
    text: "So frustrating, every update breaks something new.",
    expectedCategories: ["complaint"],
  },
  {
    text: "Been using this for a year and it's still awful, deeply disappointing.",
    expectedCategories: ["complaint"],
  },
  // ---- feature-request ----
  {
    text: "Please add a dark mode option, been asking for months.",
    expectedCategories: ["feature-request"],
  },
  {
    text: "I wish it had a bulk export button, would save so much time.",
    expectedCategories: ["feature-request"],
  },
  {
    text: "It would be great if we could schedule recurring invoices.",
    expectedCategories: ["feature-request"],
  },
  {
    text: "Filing this as a feature request: multi-currency support please.",
    expectedCategories: ["feature-request"],
  },
  {
    text: "Can you add SSO login for enterprise teams?",
    expectedCategories: ["feature-request"],
  },
  {
    text: "Would be nice if the mobile app supported offline mode.",
    expectedCategories: ["feature-request"],
  },
  {
    text: "I wish it supported custom fields for each project.",
    expectedCategories: ["feature-request"],
  },
  {
    text: "Honestly it should have a keyboard shortcut for search by now.",
    expectedCategories: ["feature-request"],
  },
  {
    text: "I really need a way to tag transactions automatically.",
    expectedCategories: ["feature-request"],
  },
  {
    text: "Would love an API so we can integrate with our internal tools.",
    expectedCategories: ["feature-request", "praise"],
    note: "also matches praise via 'love ' substring inside 'would love' — substring-matching side effect, not a fixture error.",
  },
  {
    text: "Syncing to calendar should be automatic, not a manual toggle.",
    expectedCategories: ["feature-request"],
  },
  {
    text: "There's a missing feature everyone on our team keeps asking about: shared templates.",
    expectedCategories: ["feature-request"],
  },
  // ---- bug ----
  {
    text: "The app keeps crashing every time I open the settings page.",
    expectedCategories: ["bug"],
  },
  {
    text: "Getting an error whenever I try to upload a CSV file.",
    expectedCategories: ["bug"],
  },
  {
    text: "Login doesn't work on Safari, keeps spinning forever.",
    expectedCategories: ["bug"],
  },
  {
    text: "Everything is broken since the last release, nothing loads.",
    expectedCategories: ["bug"],
  },
  {
    text: "There's a weird glitch where the sidebar disappears randomly.",
    expectedCategories: ["bug"],
  },
  {
    text: "The importer fails to parse any file over 10MB.",
    expectedCategories: ["bug"],
  },
  {
    text: "Notifications are always broken on Android for some reason.",
    expectedCategories: ["bug"],
  },
  {
    text: "The dashboard doesn't sync between my laptop and phone anymore.",
    expectedCategories: ["bug"],
  },
  {
    text: "Sync fails randomly, sometimes it works and sometimes it just hangs.",
    expectedCategories: ["bug"],
  },
  {
    text: "Every request to the API just ends in a timeout now.",
    expectedCategories: ["bug"],
  },
  {
    text: "The app is always broken after every single update, so tired of it.",
    expectedCategories: ["bug"],
  },
  {
    text: "Uploads keep crashing the whole browser tab.",
    expectedCategories: ["bug"],
  },
  // ---- missing-capability ----
  {
    text: "This tool doesn't support exporting to PDF at all.",
    expectedCategories: ["missing-capability"],
  },
  {
    text: "There's no way to bulk-delete old records, super annoying.",
    expectedCategories: ["complaint", "missing-capability"],
    note: "also matches complaint via 'annoying' — legitimately a dual-signal post, not a fixture error.",
  },
  {
    text: "I can't find a way to invite more than 5 teammates.",
    expectedCategories: ["missing-capability"],
  },
  {
    text: "The plan completely lacks any kind of audit log.",
    expectedCategories: ["missing-capability"],
  },
  {
    text: "There's no option to change the default currency for the whole workspace.",
    expectedCategories: ["missing-capability"],
  },
  {
    text: "It doesn't support recurring billing for annual plans.",
    expectedCategories: ["missing-capability"],
  },
  {
    text: "No way to filter by custom tags anywhere in the UI.",
    expectedCategories: ["missing-capability"],
  },
  {
    text: "I can't find a way to export raw data, only summary reports.",
    expectedCategories: ["missing-capability"],
  },
  {
    text: "The reporting module lacks any drill-down capability.",
    expectedCategories: ["missing-capability"],
  },
  {
    text: "There's no option to disable email notifications entirely.",
    expectedCategories: ["missing-capability"],
  },
  // ---- workflow-friction ----
  {
    text: "Setting up a new project is so tedious, ten screens just to start.",
    expectedCategories: ["workflow-friction"],
  },
  {
    text: "Approving invoices takes too long, there are so many steps.",
    expectedCategories: ["workflow-friction"],
  },
  {
    text: "The whole UI feels clunky and hard to use for new hires.",
    expectedCategories: ["workflow-friction"],
  },
  {
    text: "Navigating between tabs is confusing, I get lost every time.",
    expectedCategories: ["workflow-friction"],
  },
  {
    text: "There's just too much friction getting from signup to first value.",
    expectedCategories: ["workflow-friction"],
  },
  {
    text: "Exporting reports takes forever every single week.",
    expectedCategories: ["workflow-friction"],
  },
  {
    text: "There are so many manual steps just to reconcile one invoice.",
    expectedCategories: ["workflow-friction"],
  },
  {
    text: "It's too much clicking to do something that should be one button.",
    expectedCategories: ["workflow-friction"],
  },
  {
    text: "I waste hours every week just moving data between screens.",
    expectedCategories: ["workflow-friction"],
  },
  {
    text: "This is repetitive, I do the same five clicks a hundred times a day.",
    expectedCategories: ["workflow-friction"],
  },
  // ---- pricing-complaint ----
  {
    text: "This is way too expensive for what it actually does.",
    expectedCategories: ["pricing-complaint"],
  },
  {
    text: "Their pricing sucks compared to literally every competitor.",
    expectedCategories: ["complaint", "pricing-complaint"],
    note: "also matches complaint via 'sucks' — a real dual-signal pricing rant.",
  },
  {
    text: "The enterprise tier is completely overpriced for small teams.",
    expectedCategories: ["pricing-complaint"],
  },
  {
    text: "Honestly it's not worth the price given how buggy it still is.",
    expectedCategories: ["bug", "pricing-complaint"],
    note: "also matches bug via 'buggy' containing 'bug' — a real dual-signal post about a buggy, overpriced product.",
  },
  {
    text: "It cost too much once we added five more seats, way too expensive for a startup.",
    expectedCategories: ["pricing-complaint"],
  },
  {
    text: "The recent price increase pushed us to reconsider the whole plan.",
    expectedCategories: ["pricing-complaint"],
  },
  {
    text: "Their pricing is insane for a tool that's missing basic features.",
    expectedCategories: ["pricing-complaint"],
  },
  {
    text: "I can't justify paying this much for something this limited.",
    expectedCategories: ["pricing-complaint"],
  },
  {
    text: "At this rate it's just not worth $50 a month anymore.",
    expectedCategories: ["pricing-complaint"],
  },
  {
    text: "We're cancelling because of the price, plain and simple.",
    expectedCategories: ["pricing-complaint"],
  },
  {
    text: "We really need a cheaper option, the current tier is brutal on budget.",
    expectedCategories: ["pricing-complaint"],
  },
  // ---- migration ----
  {
    text: "We switched from Asana to this after months of frustration.",
    expectedCategories: ["complaint", "migration"],
    note: "also matches complaint via 'frustrat' — real dual-signal migration story.",
  },
  {
    text: "Our team migrated from Jira last quarter and never looked back.",
    expectedCategories: ["migration"],
  },
  {
    text: "We moved away from the old vendor entirely by January.",
    expectedCategories: ["migration"],
  },
  {
    text: "I left for a competitor that actually ships requested features.",
    expectedCategories: ["migration"],
  },
  {
    text: "We're switching to a different provider next renewal cycle.",
    expectedCategories: ["migration"],
  },
  {
    text: "I moved to a different app after the third outage this month.",
    expectedCategories: ["migration"],
  },
  {
    text: "I replaced this with a lighter, cheaper tool two weeks ago.",
    expectedCategories: ["migration"],
  },
  {
    text: "We migrated away from this platform after the support went downhill.",
    expectedCategories: ["migration"],
  },
  {
    text: "I'm leaving this tool behind, it just can't keep up anymore.",
    expectedCategories: ["migration"],
  },
  {
    text: "We switched because the new pricing made no sense for our team size.",
    expectedCategories: ["migration"],
  },
  {
    text: "The competitor is too expensive too, so we're stuck for now.",
    expectedCategories: ["pricing-complaint", "migration"],
    note: "also matches pricing-complaint via 'too expensive' — genuinely ambiguous migration/pricing post.",
  },
  {
    text: "The alternative isn't good either, but at least it's cheaper.",
    expectedCategories: ["migration"],
  },
  // ---- looking-for-alternative ----
  {
    text: "Does anyone know a good alternative to this for small teams?",
    expectedCategories: ["looking-for-alternative"],
  },
  {
    text: "Looking for alternative options before our renewal hits.",
    expectedCategories: ["looking-for-alternative"],
  },
  {
    text: "Any recommendations for a replacement for this CRM?",
    expectedCategories: ["looking-for-alternative"],
  },
  {
    text: "I'm looking for an alternative that actually has mobile support.",
    expectedCategories: ["looking-for-alternative"],
  },
  {
    text: "I can't find a tool that does both invoicing and time tracking well.",
    expectedCategories: ["looking-for-alternative", "market-gap"],
    note: "deliberately also matches market-gap — 'i can't find a tool' is genuinely ambiguous between seeking an alternative and no solution existing at all, per spec.",
  },
  {
    text: "There is no solution out there that handles multi-entity accounting.",
    expectedCategories: ["looking-for-alternative", "market-gap"],
    note: "deliberately also matches market-gap, per spec's documented deliberate overlap.",
  },
  {
    text: "I've searched everywhere for something simpler and come up empty.",
    expectedCategories: ["looking-for-alternative", "market-gap"],
    note: "deliberately also matches market-gap, per spec's documented deliberate overlap.",
  },
  {
    text: "What's a solid replacement for this that doesn't need a contract?",
    expectedCategories: ["looking-for-alternative"],
  },
  {
    text: "Been hunting for an alternative to this for weeks now.",
    expectedCategories: ["looking-for-alternative"],
  },
  {
    text: "I cant find a tool that syncs with both Xero and Stripe cleanly.",
    expectedCategories: ["looking-for-alternative", "market-gap"],
    note: "deliberately also matches market-gap, per spec's documented deliberate overlap.",
  },
  // ---- buying-intent ----
  {
    text: "I would be willing to pay double if it just worked reliably.",
    expectedCategories: ["buying-intent"],
  },
  {
    text: "I'd happily pay for a version of this without the ads.",
    expectedCategories: ["buying-intent"],
  },
  {
    text: "Take my money, I've been waiting for something like this for years.",
    expectedCategories: ["buying-intent"],
  },
  {
    text: "I'm ready to buy today if you add SSO support.",
    expectedCategories: ["buying-intent"],
  },
  {
    text: "Shut up and take my money, this is exactly what our team needed.",
    expectedCategories: ["buying-intent"],
  },
  {
    text: "Where can I buy the pro tier, the free plan is too limited?",
    expectedCategories: ["buying-intent"],
  },
  {
    text: "I'd subscribe in a heartbeat if it had a proper API.",
    expectedCategories: ["buying-intent"],
  },
  {
    text: "I'd pay monthly for this without even thinking twice.",
    expectedCategories: ["buying-intent"],
  },
  {
    text: "I'd pay for this even at twice the current price.",
    expectedCategories: ["buying-intent"],
  },
  {
    text: "We'd be looking to buy seats for the whole department next quarter.",
    expectedCategories: ["buying-intent"],
  },
  // ---- praise ----
  {
    text: "I love this product, it's completely changed how our team works.",
    expectedCategories: ["praise"],
  },
  {
    text: "Absolutely amazing tool, can't imagine going back to spreadsheets.",
    expectedCategories: ["praise"],
  },
  {
    text: "Great job on the redesign, the new dashboard is so much cleaner.",
    expectedCategories: ["praise"],
  },
  {
    text: "This is awesome, exactly what our small team needed.",
    expectedCategories: ["praise"],
  },
  {
    text: "Best tool I've used in years for managing our pipeline.",
    expectedCategories: ["praise"],
  },
  {
    text: "Highly recommend this to anyone running a small agency.",
    expectedCategories: ["praise"],
  },
  {
    text: "The support team did an amazing job resolving my ticket in minutes.",
    expectedCategories: ["praise"],
  },
  {
    text: "I love the onboarding flow, it made setup genuinely painless.",
    expectedCategories: ["praise"],
  },
  {
    text: "Such a great job by the team, the new update is awesome.",
    expectedCategories: ["praise"],
  },
  {
    text: "This is hands down the best tool for freelancers I've tried.",
    expectedCategories: ["praise"],
  },
  // ---- market-gap ----
  {
    text: "Why doesn't this exist yet? Feels like such an obvious gap.",
    expectedCategories: ["market-gap"],
  },
  {
    text: "Someone should build this, I'd use it the day it launches.",
    expectedCategories: ["market-gap"],
  },
  {
    text: "Why doesnt this exist already, it seems so simple to build.",
    expectedCategories: ["market-gap"],
  },
  {
    text: "I can't find a tool that solves this specific workflow at all.",
    expectedCategories: ["looking-for-alternative", "market-gap"],
    note: "deliberately also matches looking-for-alternative, per spec's documented deliberate overlap.",
  },
  {
    text: "There is no solution for tracking this across multiple vendors.",
    expectedCategories: ["looking-for-alternative", "market-gap"],
    note: "deliberately also matches looking-for-alternative, per spec's documented deliberate overlap.",
  },
  {
    text: "I've searched everywhere and nothing like this exists yet.",
    expectedCategories: ["looking-for-alternative", "market-gap"],
    note: "deliberately also matches looking-for-alternative, per spec's documented deliberate overlap.",
  },
  {
    text: "Ive searched everywhere for a tool like this and found nothing.",
    expectedCategories: ["looking-for-alternative", "market-gap"],
    note: "deliberately also matches looking-for-alternative, per spec's documented deliberate overlap.",
  },
  {
    text: "Someone should build this before I end up doing it myself.",
    expectedCategories: ["market-gap"],
  },
  {
    text: "Why doesn't this exist for freelancers, only enterprise tools do this.",
    expectedCategories: ["market-gap"],
  },
  {
    text: "I cant find a tool that handles this use case at all.",
    expectedCategories: ["looking-for-alternative", "market-gap"],
    note: "deliberately also matches looking-for-alternative, per spec's documented deliberate overlap.",
  },
  // ---- workaround ----
  {
    text: "I built a spreadsheet just to track this since nothing else works.",
    expectedCategories: ["workaround"],
  },
  {
    text: "I made my own script to pull the data every morning.",
    expectedCategories: ["workaround"],
  },
  {
    text: "I hacked together a Zapier flow just to get basic reporting.",
    expectedCategories: ["workaround"],
  },
  {
    text: "I use Notion for this because nothing purpose-built exists.",
    expectedCategories: ["workaround"],
  },
  {
    text: "I copy and paste this data between three tools every single day.",
    expectedCategories: ["workaround"],
  },
  {
    text: "I do this manually every Friday because there's no automation.",
    expectedCategories: ["workaround"],
  },
  {
    text: "I built a spreadsheet with a dozen macros just to make this bearable.",
    expectedCategories: ["workaround"],
  },
  {
    text: "I made my own script in Python to avoid doing this by hand.",
    expectedCategories: ["workaround"],
  },
  {
    text: "I hacked together some Airtable automations to fake the feature.",
    expectedCategories: ["workaround"],
  },
  {
    text: "I do this manually because the export never matches what we need.",
    expectedCategories: ["workaround"],
  },
  // ---- existing-spending ----
  {
    text: "We already pay for three different tools that overlap with this.",
    expectedCategories: ["existing-spending"],
  },
  {
    text: "Our company spends about $2000 a month on tools like this.",
    expectedCategories: ["existing-spending"],
  },
  {
    text: "We currently use a competitor and pay a hefty annual fee.",
    expectedCategories: ["existing-spending"],
  },
  {
    text: "We pay every month for a tool that barely does half of this.",
    expectedCategories: ["existing-spending"],
  },
  {
    text: "We have a subscription to a similar product already.",
    expectedCategories: ["existing-spending"],
  },
  {
    text: "Our company spends way more than we should on overlapping SaaS tools.",
    expectedCategories: ["existing-spending"],
  },
  {
    text: "We already pay for the enterprise tier of a competing product.",
    expectedCategories: ["existing-spending"],
  },
  {
    text: "We currently use two separate tools just to cover what this does.",
    expectedCategories: ["existing-spending"],
  },
  {
    text: "We have a subscription for this exact category, just a different brand.",
    expectedCategories: ["existing-spending"],
  },
  {
    text: "We pay every month for something that's honestly worse than this.",
    expectedCategories: ["existing-spending"],
  },
  // ---- other / noisy ----
  {
    text: "Quarterly earnings report published today for the tech sector.",
    expectedCategories: ["other"],
    note: "noisy/irrelevant discussion, no product signal — should classify as other only.",
  },
  {
    text: "Here's a photo from our team offsite in Austin last week.",
    expectedCategories: ["other"],
    note: "noisy/irrelevant discussion.",
  },
  {
    text: "The conference keynote starts at 9am Pacific tomorrow.",
    expectedCategories: ["other"],
    note: "noisy/irrelevant discussion.",
  },
  {
    text: "New episode of the podcast is up, we talk about hiring trends.",
    expectedCategories: ["other"],
    note: "noisy/irrelevant discussion.",
  },
  {
    text: "Join us for the community meetup happening next Thursday.",
    expectedCategories: ["other"],
    note: "noisy/irrelevant discussion.",
  },
  {
    text: "The weather has been unusually warm this week in the Bay Area.",
    expectedCategories: ["other"],
    note: "noisy/irrelevant discussion.",
  },
  {
    text: "We're hiring a new marketing lead, link to the job posting below.",
    expectedCategories: ["other"],
    note: "noisy/irrelevant discussion.",
  },
  {
    text: "Check out this article about the history of spreadsheets.",
    expectedCategories: ["other"],
    note: "noisy/irrelevant discussion.",
  },
  {
    text: "Our newsletter this month covers three unrelated industry trends.",
    expectedCategories: ["other"],
    note: "noisy/irrelevant discussion.",
  },
  {
    text: "The museum exhibit on typography opens to the public next month.",
    expectedCategories: ["other"],
    note: "noisy/irrelevant discussion.",
  },
  {
    text: "The city council approved a new zoning law yesterday afternoon.",
    expectedCategories: ["other"],
    note: "noisy/irrelevant discussion.",
  },
  {
    text: "Our team is heading to the annual company retreat next month.",
    expectedCategories: ["other"],
    note: "noisy/irrelevant discussion.",
  },
  {
    text: "This documentary about deep sea creatures is fascinating.",
    expectedCategories: ["other"],
    note: "noisy/irrelevant discussion.",
  },
  {
    text: "The local bakery just opened a second location downtown.",
    expectedCategories: ["other"],
    note: "noisy/irrelevant discussion.",
  },
  {
    text: "Traffic was unusually light on the highway this morning.",
    expectedCategories: ["other"],
    note: "noisy/irrelevant discussion.",
  },
  // ---- false-positive guards: negation (documented known limitation) ----
  {
    text: "This is NOT terrible, I actually love it.",
    expectedCategories: ["complaint", "praise"],
    note: "KNOWN LIMITATION: substring matching cannot see the 'NOT' negation before 'terrible', so it still fires a complaint match alongside the (correct) praise match. Documented, not a fixture bug.",
  },
  {
    text: "I don't hate this tool at all, it's been solid for us.",
    expectedCategories: ["complaint"],
    note: "KNOWN LIMITATION: negated 'don't hate' still contains the raw substring 'hate', so complaint fires incorrectly.",
  },
  {
    text: "This isn't broken at all, it works great every day.",
    expectedCategories: ["bug"],
    note: "KNOWN LIMITATION: negated 'isn't broken' still contains 'broken', so bug fires incorrectly.",
  },
  {
    text: "We haven't moved away from our current tool anytime soon.",
    expectedCategories: ["migration"],
    note: "KNOWN LIMITATION: negated 'haven't moved away from' still contains 'moved away from', so migration fires incorrectly.",
  },
  {
    text: "Not a bug, just user error on my part.",
    expectedCategories: ["bug"],
    note: "KNOWN LIMITATION: explicitly denying it's a bug ('Not a bug') still contains both 'bug' and ' error', so bug fires — arguably still a legitimate bug-adjacent signal despite the author's framing.",
  },
  {
    text: "It's not annoying at all, actually quite pleasant to use.",
    expectedCategories: ["complaint"],
    note: "KNOWN LIMITATION: negated 'not annoying' still contains 'annoying', so complaint fires incorrectly.",
  },
  {
    text: "This is far from overpriced, honestly a bargain for the features.",
    expectedCategories: ["pricing-complaint"],
    note: "KNOWN LIMITATION: negated 'far from overpriced' still contains 'overpriced', so pricing-complaint fires incorrectly.",
  },
  {
    text: "We are not switching to a different provider, we're happy here.",
    expectedCategories: ["migration"],
    note: "KNOWN LIMITATION: negated 'not switching to' still contains 'switching to', so migration fires incorrectly.",
  },
  {
    text: "I would never say this sucks, it's actually really solid.",
    expectedCategories: ["complaint"],
    note: "KNOWN LIMITATION: 'never say this sucks' still contains 'sucks', so complaint fires incorrectly.",
  },
  {
    text: "Nothing is broken, everything has been working perfectly this week.",
    expectedCategories: ["bug"],
    note: "KNOWN LIMITATION: 'Nothing is broken' still contains 'broken', so bug fires incorrectly.",
  },
  // ---- false-positive guards: genuine guards + substring noise ----
  {
    text: "The team migrated to a new office building downtown.",
    expectedCategories: ["other"],
    mustNotMatch: ["migration"],
    note: "genuine guard: 'migrated to' does not contain the required 'migrated from' substring, correctly does not match.",
  },
  {
    text: "This offers an alternative approach to project management.",
    expectedCategories: ["other"],
    mustNotMatch: ["looking-for-alternative"],
    note: "genuine guard: 'alternative approach' does not contain 'alternative to', correctly does not match.",
  },
  {
    text: "Let's debug this together over a call to fix the deploy pipeline.",
    expectedCategories: ["bug"],
    note: "KNOWN LIMITATION: substring matching finds 'bug' inside the unrelated word 'debug', firing a false-positive bug match.",
  },
  {
    text: "We stayed at a beautiful chateau over the weekend for the team offsite.",
    expectedCategories: ["complaint"],
    note: "KNOWN LIMITATION: substring matching finds 'hate' inside the unrelated word 'chateau', firing a false-positive complaint match.",
  },
  {
    text: "The report lacked detail but overall was fine.",
    expectedCategories: ["other"],
    mustNotMatch: ["missing-capability"],
    note: "genuine guard: 'lacked' does not contain the required 'lacks ' substring, correctly does not match.",
  },
  {
    text: "The onboarding docs cover this workflow, no changes needed.",
    expectedCategories: ["other"],
    mustNotMatch: ["workflow-friction", "feature-request"],
    note: "genuine guard: neutral operational text, no trigger phrases present.",
  },
  {
    text: "Our vendor renewed the contract for another year without issue.",
    expectedCategories: ["other"],
    mustNotMatch: ["migration", "existing-spending"],
    note: "genuine guard: renewal language does not contain migration or existing-spending trigger phrases.",
  },
  // ---- sarcasm (documented actual behavior, not hidden) ----
  {
    text: "Oh great, ANOTHER crash, love that.",
    expectedCategories: ["bug", "praise"],
    note: "SARCASM: the bug signal ('crash') is genuinely caught (correct), but the sarcastic 'love that' also fires a false-positive praise match — deterministic substring matching cannot detect sarcasm.",
  },
  {
    text: "Wow, so happy my export just failed again, this is fine.",
    expectedCategories: ["other"],
    note: "SARCASM: deterministic system misses this entirely (falls back to 'other') because 'failed' isn't a trigger phrase — sarcasm about a failure is invisible to keyword matching without the exact bug phrases.",
  },
  {
    text: "Cool, the app is 'broken' again, shocking nobody.",
    expectedCategories: ["bug"],
    note: "SARCASM: correctly catches the bug signal via 'broken', though the sarcastic tone/quotes around 'broken' are not understood, just the literal substring.",
  },
  {
    text: "Sure, take my money for a tool that crashes every hour, said no one ever.",
    expectedCategories: ["bug", "buying-intent"],
    note: "SARCASM: falsely fires buying-intent via 'take my money' even though the sentence is sarcastically saying the opposite — a known limitation of substring matching with no sentiment/negation awareness.",
  },
  {
    text: "Love how it just doesn't sync, very cool, very fun, ten out of ten.",
    expectedCategories: ["bug", "praise"],
    note: "SARCASM: correctly catches the bug signal ('doesn't sync') but also falsely fires praise via sarcastic 'Love how'.",
  },
  {
    text: "Great job breaking the login page again, truly amazing work.",
    expectedCategories: ["praise"],
    note: "SARCASM: falsely fires only praise ('great job', 'amazing') — the sarcastic bug complaint about 'breaking the login page' is missed entirely because 'breaking' isn't a trigger phrase (only 'broken' is).",
  },
  {
    text: "Oh sure, another price increase, exactly what I was hoping for this month.",
    expectedCategories: ["pricing-complaint"],
    note: "SARCASM: correctly catches pricing-complaint via 'price increase' despite the sarcastic delivery.",
  },
  {
    text: "Best tool ever, if by best you mean it crashes daily.",
    expectedCategories: ["bug", "praise"],
    note: "SARCASM: correctly catches bug via 'crashes', but also fires a false-positive praise match via 'best tool ever' despite the sentence undercutting itself.",
  },
  // ---- multi-problem posts (legitimately 2-4 categories at once) ----
  {
    text: "Their pricing is insane and the app keeps crashing, honestly I wish it had better export tools too.",
    expectedCategories: ["feature-request", "bug", "pricing-complaint"],
    note: "real multi-problem Reddit-style rant: pricing + bug + feature-request in one post.",
  },
  {
    text: "We already pay for two other tools, this is overpriced, and I really need a working mobile app.",
    expectedCategories: ["feature-request", "pricing-complaint", "existing-spending"],
    note: "multi-problem: existing-spending + pricing-complaint + feature-request.",
  },
  {
    text: "I hate this so much, it sucks, but I'd still pay for it if the sync bug got fixed and they added dark mode.",
    expectedCategories: ["complaint", "bug"],
    note: "multi-problem: complaint + bug, alongside conditional buying-intent/feature-request language that didn't hit an exact trigger phrase.",
  },
  {
    text: "Switched from the old vendor because it was too expensive, but this one doesn't support CSV export either.",
    expectedCategories: ["missing-capability", "pricing-complaint", "migration"],
    note: "multi-problem: migration + pricing-complaint + missing-capability.",
  },
  {
    text: "I built a spreadsheet to work around the missing reporting feature, and honestly the pricing is insane too.",
    expectedCategories: ["pricing-complaint", "workaround"],
    note: "multi-problem: workaround + pricing-complaint.",
  },
  {
    text: "This is terrible, the app keeps crashing, and I'm looking for alternative options at this point.",
    expectedCategories: ["complaint", "bug", "looking-for-alternative"],
    note: "multi-problem: complaint + bug + looking-for-alternative.",
  },
  {
    text: "Love the design but it's overpriced, doesn't support SSO, and I really need better onboarding docs.",
    expectedCategories: ["feature-request", "missing-capability", "pricing-complaint", "praise"],
    note: "multi-problem: praise + pricing-complaint + missing-capability + feature-request, all in one mixed post.",
  },
  {
    text: "We currently use a competitor, we already pay a lot for it, and honestly there is no solution that does both invoicing and payroll.",
    expectedCategories: ["looking-for-alternative", "market-gap", "existing-spending"],
    note: "multi-problem: existing-spending + looking-for-alternative + market-gap.",
  },
  {
    text: "So frustrating, the export always fails, and I wish it had a bulk edit mode, please add that soon.",
    expectedCategories: ["complaint", "feature-request"],
    note: "multi-problem: complaint + feature-request.",
  },
  {
    text: "I'd happily pay more if the sync bug got fixed, right now it always fails and it's driving the whole team crazy.",
    expectedCategories: ["bug", "buying-intent"],
    note: "multi-problem: buying-intent + bug.",
  },
  {
    text: "We migrated from our old CRM because support was awful, but this new one is also too expensive and lacks a mobile app.",
    expectedCategories: ["complaint", "missing-capability", "pricing-complaint", "migration"],
    note: "multi-problem: complaint + missing-capability + pricing-complaint + migration, a genuinely dense real-world rant.",
  },
  {
    text: "I hacked together a script to avoid this, but honestly someone should build a real tool, this one keeps crashing constantly.",
    expectedCategories: ["bug", "workaround"],
    note: "multi-problem: bug + workaround (also gestures at market-gap phrasing 'someone should build' without hitting a separate exact market-gap trigger beyond workaround/bug).",
  },
  // ---- mixed sentiment (praise AND complaint signals together) ----
  {
    text: "I love the core product but the pricing is insane for what we get.",
    expectedCategories: ["pricing-complaint", "praise"],
    note: "mixed sentiment: praise for the product alongside a pricing complaint.",
  },
  {
    text: "The design is amazing, the team did a great job, but it's overpriced for small businesses.",
    expectedCategories: ["pricing-complaint", "praise"],
    note: "mixed sentiment: praise + pricing-complaint.",
  },
  {
    text: "Highly recommend the UI, it's beautiful, though the export feature is completely broken.",
    expectedCategories: ["bug", "praise"],
    note: "mixed sentiment: praise + bug.",
  },
  {
    text: "This is the best tool I've used for tasks, but honestly I really need better reporting.",
    expectedCategories: ["feature-request", "praise"],
    note: "mixed sentiment: praise + feature-request.",
  },
  {
    text: "Great job on the redesign, love it, but the sync keeps failing randomly.",
    expectedCategories: ["praise"],
    note: "mixed sentiment: praise fires; the bug phrase 'keeps failing randomly' doesn't hit the exact 'fails randomly' trigger, illustrating substring-matching's phrase-order sensitivity.",
  },
  {
    text: "Amazing support team, but the mobile app is always broken.",
    expectedCategories: ["bug", "praise"],
    note: "mixed sentiment: praise + bug.",
  },
  {
    text: "I love this tool overall, though I wish it had multi-currency support.",
    expectedCategories: ["feature-request", "praise"],
    note: "mixed sentiment: praise + feature-request.",
  },
  {
    text: "Best tool for our workflow, awesome onboarding, but not worth the price at this tier.",
    expectedCategories: ["pricing-complaint", "praise"],
    note: "mixed sentiment: praise + pricing-complaint.",
  },
];

describe("classifyItem — expanded phrase coverage (data-driven fixtures)", () => {
  for (const fixture of FIXTURES) {
    const title = fixture.note ? `${fixture.text} [${fixture.note.slice(0, 40)}...]` : fixture.text;
    it(`classifies: ${title}`, () => {
      const result = classifyItem(makeItem(fixture.text));
      const actualCategories = result.categories.map((c) => c.category);

      for (const expected of fixture.expectedCategories) {
        expect(actualCategories, `expected "${expected}" for: ${fixture.text}`).toContain(expected);
      }

      for (const forbidden of fixture.mustNotMatch ?? []) {
        expect(actualCategories, `did not expect "${forbidden}" for: ${fixture.text}`).not.toContain(forbidden);
      }
    });
  }

  it("dedicated urgency and emotionalIntensityScore fields are always present on ClassifiedItem", () => {
    const result = classifyItem(makeItem("We need this today, our launch is blocked without it."));
    expect(typeof result.urgency).toBe("boolean");
    expect(typeof result.emotionalIntensityScore).toBe("number");
    expect(result.urgency).toBe(true);
  });

  it("summarizes measured recall and false-positive rate across the full fixture set", () => {
    let expectedTotal = 0;
    let expectedHit = 0;
    let mustNotTotal = 0;
    let mustNotFalsePositive = 0;

    for (const fixture of FIXTURES) {
      const result = classifyItem(makeItem(fixture.text));
      const actualCategories = new Set(result.categories.map((c) => c.category));

      for (const expected of fixture.expectedCategories) {
        expectedTotal++;
        if (actualCategories.has(expected)) expectedHit++;
      }
      for (const forbidden of fixture.mustNotMatch ?? []) {
        mustNotTotal++;
        if (actualCategories.has(forbidden)) mustNotFalsePositive++;
      }
    }

    const recall = expectedTotal === 0 ? 1 : expectedHit / expectedTotal;
    const falsePositiveRate = mustNotTotal === 0 ? 0 : mustNotFalsePositive / mustNotTotal;

    // eslint-disable-next-line no-console
    console.log(
      `[detector-expanded fixture summary] fixtures=${FIXTURES.length} ` +
        `expectedCategoryAssertions=${expectedTotal} recall=${recall.toFixed(3)} ` +
        `mustNotMatchAssertions=${mustNotTotal} falsePositiveRate=${falsePositiveRate.toFixed(3)}`,
    );

    // Measured at authoring time: recall = 1.000 (every expectedCategories
    // entry was captured directly from classifyItem's real output, so this
    // is a regression guard — if a future phrase-list edit narrows or
    // breaks a pattern, recall drops below 1 and this assertion fails).
    // falsePositiveRate = 0.000 (every mustNotMatch entry was verified to
    // genuinely not match at authoring time). Thresholds below are set
    // below the measured values (not at them) so this test has real slack
    // and isn't just re-asserting today's exact numbers.
    expect(recall).toBeGreaterThanOrEqual(0.75);
    expect(falsePositiveRate).toBeLessThanOrEqual(0.15);
  });
});
