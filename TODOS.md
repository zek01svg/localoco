# TODOs

Deferred work that has been deliberately pushed out of scope. Nothing here is
implemented behavior.

## Public open-now

- [ ] Wire `openNow` into the public discovery surface. PRS-180 delivered the
      tested Singapore-time evaluator (`server/lib/opening-hours.ts`) and
      owner-side Opening hours storage, but the public Listings feed
      (`GET /api/listings`) is cached and has no public listing detail page
      yet, so a time-dependent `openNow` field was not added there. Add it
      with the public listing page work (or to the feed when caching allows).
