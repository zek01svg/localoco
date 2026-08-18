# LocaLoco

LocaLoco is a Singapore local-business discovery and community platform. This
glossary defines the shared language for businesses, their owners, public
listings, community contributions, and user rewards.

## Identity and ownership

**User**:
An authenticated person who uses LocaLoco and may own zero or more Businesses.
_Avoid_: account, member, customer

**Business**:
A real-world local business represented on LocaLoco.
_Avoid_: listing, vendor

**Listing**:
A Business’s public presence on LocaLoco, including the information people use
to discover and evaluate it.
_Avoid_: business, profile

**Draft Listing**:
A Listing created alongside its Business but not yet published; only the
Business owner can see it, and it never appears in discovery responses.
_Avoid_: pending listing, unpublished listing

**Listing lifecycle**:
The sequence of states a Listing passes through: Draft, Pending review, Published, Rejected, or Suspended. Only Published Listings are discoverable by the public.
_Avoid_: listing status, listing state, publishing workflow

**Moderation**:
The review and decision process where an Administrator evaluates a submitted Listing and publishes, rejects, or suspends it with an immutable reason.
_Avoid_: approval, screening, curation, vetting

**Listing photo**:
An image attached to a Listing by its Business owner. Stored privately in
object storage and served only through short-lived server-issued presigned
URLs; never publicly addressable. Deleting a Listing photo is permanent.
_Avoid_: picture, image, attachment

**Business owner**:
A User who owns a Business and may manage its Listing and public Announcements.
_Avoid_: vendor account, administrator

**Administrator**:
A User granted platform-wide administrative privileges directly in the database. An Administrator can moderate Listings, transfer ownership, and manage platform resources across all Businesses.
_Avoid_: admin, superuser, staff, root

**UEN**:
The canonical identifier of a Business in LocaLoco.
_Avoid_: business ID, listing ID, registration number

**Public profile**:
A User's public-facing page and API response containing only their display
name, avatar, and public contributions — nothing else. Private account
information is structurally absent, never conditionally hidden.
_Avoid_: profile page, personal page

**Personal profile**:
A User's private account record and API response: display name, avatar, email,
email-verification state, and registration timestamp. Only the signed-in User
can read or update it, and it is never cached publicly.
_Avoid_: account settings, profile page

## Discovery and community

**Business discovery**:
The activity of finding Businesses through their Listings, location, name,
category, attributes, or community information.
_Avoid_: search, browsing

**Review**:
A User’s written evaluation of a Business that includes a Rating.
_Avoid_: feedback, comment

**Rating**:
The numeric score attached to a Review.
_Avoid_: review, scorecard

**Forum post**:
The parent discussion in the community forum, associated with a Business.
_Avoid_: thread, topic

**Reply**:
A response to a Forum post.
_Avoid_: comment, response post

**Bookmark**:
A User’s saved reference to a Business for later access.
_Avoid_: favorite, saved listing

**Announcement**:
A public update published by a Business owner for a Business's audience.
_Avoid_: notification, alert, message

**Opening hours**:
A Business's schedule of open intervals, stored as one entry per day of the
week (Monday through Sunday). A day is either 24 hours or a single open-close
interval in Singapore time; an interval that crosses midnight belongs to the
day it opens on. A day without an entry means closed.
_Avoid_: business hours, opening times, store hours

**Open-now**:
A derived, time-dependent statement about a Business: whether its Opening
hours cover the current instant in Singapore time. A Business with no Opening
hours is never open-now.
_Avoid_: currently open, is-open status

**Listing location**:
The verified coordinates (latitude and longitude) resolved from a Listing's
address by the geocoding provider at write time, stored on the Listing.
`null` for Listings whose address has not been re-validated since the
provider integration shipped.
_Avoid_: pin, map marker, geo coordinates

## Rewards

**Points**:
A balance credited to a User for eligible community contributions. Points measure
participation and are not money.
_Avoid_: reward points, credit

**Voucher**:
An issued benefit associated with a User that has an amount, lifecycle status,
and expiration.
_Avoid_: coupon, reward
