alter table public.events
  add column if not exists highlight_image_url text,
  add column if not exists highlight_note text;

-- Preserve highlights already linked to an event on that event object.
update public.events as event
set
  highlight_image_url = coalesce(event.highlight_image_url, highlight.image_url),
  highlight_note = coalesce(event.highlight_note, highlight.highlight)
from (
  select distinct on (event_id) event_id, image_url, highlight
  from public.highlights
  where event_id is not null
  order by event_id, created_at desc
) as highlight
where event.id = highlight.event_id;

-- Preserve legacy standalone highlights by turning them into archived event objects.
insert into public.events (
  title,
  date,
  type,
  location,
  description,
  archived,
  published,
  registration_open,
  highlight_image_url,
  highlight_note
)
select
  title,
  date,
  'Meetup',
  place,
  highlight,
  true,
  true,
  false,
  image_url,
  highlight
from public.highlights
where event_id is null;

drop table public.highlights;
