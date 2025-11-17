/**
 * Sanitizes and normalizes business name input for matching
 * - Converts to lowercase
 * - Removes extra spaces (leading, trailing, multiple)
 * - Removes special characters except spaces, hyphens, and apostrophes
 * - Trims the result
 */
export function sanitizeBusinessName(input: string): string {
    if (!input) return "";

    return input
        .toLowerCase() // Convert to lowercase
        .replace(/[^\w\s'-]/g, "") // Remove special chars except spaces, hyphens, apostrophes
        .replace(/\s+/g, " ") // Replace multiple spaces with single space
        .trim(); // Remove leading/trailing spaces
}

/**
 * Searches for a business by name in the businesses list
 * Uses fuzzy matching to handle slight variations
 */
export function findBusinessByName(
    businessName: string,
    businesses: Array<{ uen: string; name: string }>,
): string | null {
    if (!businessName || !businesses.length) return null;

    const sanitizedInput = sanitizeBusinessName(businessName);

    // Try exact match first
    const exactMatch = businesses.find(
        (b) => sanitizeBusinessName(b.name) === sanitizedInput,
    );

    if (exactMatch) return exactMatch.uen;

    // Try partial match (input is contained in business name)
    const partialMatch = businesses.find((b) =>
        sanitizeBusinessName(b.name).includes(sanitizedInput),
    );

    if (partialMatch) return partialMatch.uen;

    // Try reverse partial match (business name is contained in input)
    const reverseMatch = businesses.find((b) =>
        sanitizedInput.includes(sanitizeBusinessName(b.name)),
    );

    if (reverseMatch) return reverseMatch.uen;

    return null;
}

/**
 * Fetches a business UEN from the backend API by searching for the business name
 */
export async function fetchBusinessUenByName(
    businessName: string,
): Promise<string | null> {
    if (!businessName || !businessName.trim()) return null;

    try {
        const sanitizedName = sanitizeBusinessName(businessName);
        const response = await fetch(
            `/api/businesses/search?name=${encodeURIComponent(sanitizedName)}`,
        );

        if (!response.ok) {
            console.warn("Business search failed:", response.statusText);
            return null;
        }

        const business = await response.json();
        return business?.uen || null;
    } catch (error) {
        console.error("Error fetching business by name:", error);
        return null;
    }
}
