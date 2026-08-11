-- Migration: Add nominee_names to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS nominee_names TEXT[];
