-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hostname" TEXT NOT NULL,
    "rootDomain" TEXT NOT NULL,
    "sources" TEXT NOT NULL,
    "dnsRecordType" TEXT,
    "dnsValue" TEXT,
    "proxied" BOOLEAN,
    "ttl" INTEGER,
    "tunnelId" TEXT,
    "tunnelName" TEXT,
    "tunnelService" TEXT,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" DATETIME NOT NULL,
    "removedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AssetProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT '其他',
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetProfile_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_hostname_key" ON "Asset"("hostname");

-- CreateIndex
CREATE INDEX "Asset_rootDomain_idx" ON "Asset"("rootDomain");

-- CreateIndex
CREATE INDEX "Asset_removedAt_idx" ON "Asset"("removedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssetProfile_assetId_key" ON "AssetProfile"("assetId");
