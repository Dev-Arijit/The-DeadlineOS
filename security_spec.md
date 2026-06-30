# Security Specification: The DeadlineOS

## 1. Data Invariants
1. A mission records collection document must have a unique ID matching the path parameter `missionId`.
2. A mission cannot have an invalid status. It must be either `active`, `completed`, or `abandoned`.
3. Read and write operations to a mission are strictly scoped to the pilot (owner) of that mission (`userId`).
4. To handle iframe/cookie popup blocks, authenticated users use standard user UIDs, while custom session links use `custom_` prefixed UIDs.

## 2. Invalid Attack Payloads (The "Dirty Dozen")
To ensure zero-trust security and prevent Update-Gaps, the following attack vectors must be rejected by rules:
1. **Identity Spoofing**: Attempting to write a mission where `userId` is different from `request.auth.uid`.
2. **Junk Paths / ID Poisoning**: Specifying a giant string or containing invalid characters as the missionId.
3. **Ghost Fields Injection**: Injecting unsolicited keys like `isAdmin: true` into the mission document.
4. **Invalid State Escalation**: Transitioning the mission status to an unverified arbitrary state (e.g., `status: 'super-admin'`).
5. **No-Authentication Scraping**: Trying to fetch all missions without any valid userId ownership filter.
6. **Denial of Wallet Range Attack**: Attempting to insert huge arrays into `tasks` or `milestones` to exhaust storage.

## 3. Fortress Verification Strategy
All rules are hard-coded to reject the above payloads. Every read or write must satisfy owner checks, ID specifications, and schema shape constraints.
