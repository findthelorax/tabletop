-- Add preferred table relation to WaitlistEntry
ALTER TABLE "WaitlistEntry" ADD COLUMN IF NOT EXISTS "preferredTableId" TEXT;

-- Foreign key to Table (set null if the table is deleted)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WaitlistEntry_preferredTableId_fkey'
  ) THEN
    ALTER TABLE "WaitlistEntry"
      ADD CONSTRAINT "WaitlistEntry_preferredTableId_fkey"
      FOREIGN KEY ("preferredTableId")
      REFERENCES "Table"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

-- Helpful index
CREATE INDEX IF NOT EXISTS "WaitlistEntry_restaurantId_preferredTableId_idx"
  ON "WaitlistEntry"("restaurantId", "preferredTableId");
