-- Add 'resent' to the vendor_status enum
ALTER TYPE vendor_status ADD VALUE IF NOT EXISTS 'resent';