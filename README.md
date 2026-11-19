# Offcut Stock

A personal inventory for sheet goods and offcuts in a small woodworking shop.

Cut-list nesting is already well served by tools like CutList Optimizer and OpenCutList.
This app covers what those tools don't do: keeping a persistent record of the offcuts you
actually have, labelling them, and reusing them in the next project.

## v1 scope
1. **Stock list**: every piece gets an ID (`OC-0042`), material, thickness, length × width (mm), grain, location and status.
2. **Quick add**: a phone form that remembers material, thickness and location, so each offcut takes two numbers.
3. **QR sticker labels**: print A4 sticker sheets; scanning a sticker opens the piece.
4. **Project cut list**: suggests stock pieces for each part, offcuts first and smallest fit first, respecting grain.
5. **"Went to plan?" close-out**: used pieces are consumed and leftovers become new stock.
6. **CSV export**.

Out of scope for v1: nesting, multiple users, costing.

## Stack
React + TypeScript + Vite, Supabase (Postgres + auth).

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill in your Supabase URL and anon key.
3. Run the SQL in `supabase/migrations/` in the Supabase SQL editor.
4. `npm run dev`
