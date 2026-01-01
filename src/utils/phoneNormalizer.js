/**
 * Comprehensive Phone Number Normalization Utility
 * Handles various phone number formats and normalizes them to E.164 format
 */

class PhoneNormalizer {
    constructor() {
        this.defaultCountryCode = '91'; // India
    }

    /**
     * Normalize phone number to E.164 format (+91XXXXXXXXXX)
     * @param {string} phone 
     * @returns {string}
     */
    normalize(phone) {
        if (!phone) return '';

        // Extract digits and handle JIDs
        let cleaned = phone.toString().split('@')[0].replace(/[^\d]/g, '');

        // 1. Handle leading zeros (e.g., 08123133382 -> 8123133382)
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }

        // 2. Handle Indian country code logic
        // If it starts with 91 and has 12 digits, it's already got the country code
        if (cleaned.startsWith('91') && cleaned.length === 12) {
            // Check if it's potentially a mistake (like 910...)
            if (cleaned.startsWith('910')) {
                cleaned = cleaned.substring(2); // Remove the 91 and keep the 0 (will be handled by recursion/step1)
                return this.normalize(cleaned);
            }
        }
        // If it's 10 digits, add '91'
        else if (cleaned.length === 10) {
            cleaned = '91' + cleaned;
        }

        // 3. Ensure it starts with the country code if it looks like an Indian number but is missing it
        // (This is a safety net for any other odd lengths)
        if (cleaned.length === 10 && !cleaned.startsWith('91')) {
            cleaned = '91' + cleaned;
        }

        return `+${cleaned}`;
    }

    /**
     * Clean for GHL search (sometimes search works better without +)
     */
    cleanForSearch(phone) {
        const normalized = this.normalize(phone);
        return normalized.replace('+', '');
    }
}

module.exports = new PhoneNormalizer();
