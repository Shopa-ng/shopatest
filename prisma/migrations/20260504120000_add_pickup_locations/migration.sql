CREATE TABLE "pickup_locations" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "campusId" TEXT NOT NULL,
  CONSTRAINT "pickup_locations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "pickup_locations" ADD CONSTRAINT "pickup_locations_campusId_fkey"
  FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
