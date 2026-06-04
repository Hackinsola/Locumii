// Platform fee constants. Kept out of component/hook files per code-standards
// ("no hardcoded commission rates in components/hooks"). The authoritative
// commission computation also runs server-side in the release-payment Edge
// Function (not yet built); this constant keeps the client-side preview in sync.

// Platform commission as a fraction of the gross shift amount (10%, matching
// architecture.md / code-standards.md).
export const COMMISSION_RATE = 0.1;
