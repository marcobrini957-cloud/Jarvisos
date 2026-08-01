-- User-owned setup types and trade tags.
--
-- Both lists were hardcoded in TradeAnnotationModal.tsx: eight ICT-flavoured
-- setups and eight mistake tags. Every trader names their own setups, and a
-- fixed list quietly tells anyone who does not trade that way that the product
-- is not for them. They are now editable — add, rename, reorder, delete,
-- including deleting everything we shipped.
--
-- NULL means "never touched it, use the defaults". That is deliberate: it keeps
-- the defaults in one place in the code, lets us improve them later for people
-- who never customised, and means this migration cannot change what any
-- existing user currently sees. An empty array is a real, respected choice —
-- the trader who deleted every one of them gets an empty list, not the defaults
-- back.
--
-- Applied to production 2026-08-01.

alter table user_profiles
  add column if not exists setup_types text[],
  add column if not exists trade_tags  text[];

comment on column user_profiles.setup_types is
  'User-owned setup names. NULL = use DEFAULT_SETUP_TYPES from lib/trading/labels.ts. Empty array = the user deleted them all, which is allowed.';
comment on column user_profiles.trade_tags is
  'User-owned trade tags. NULL = use DEFAULT_TRADE_TAGS. Empty array is a real choice.';
