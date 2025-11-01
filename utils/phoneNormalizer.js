/**
 * Comprehensive Phone Number Normalization Utility
 * Handles various phone number formats and normalizes them to E.164 format
 * 
 * Examples:
 * +9108123133382 -> +918123133382 (removes extra 0)
 * +918123133382 -> +918123133382 (already correct)
 * 918123133382 -> +918123133382 (adds +)
 * 08123133382 -> +918123133382 (removes leading 0, adds country code)
 * 8123133382 -> +918123133382 (adds country code)
 */

class PhoneNormalizer {
  constructor() {
    // Common country codes and their patterns
    this.countryPatterns = {
      'IN': {
        code: '91',
        minLength: 10,
        maxLength: 10,
        pattern: /^[6-9]\d{9}$/  // Indian mobile numbers start with 6-9
      },
      'US': {
        code: '1',
        minLength: 10,
        maxLength: 10,
        pattern: /^[2-9]\d{9}$/
      }
    };
    
    this.defaultCountry = 'IN'; // Default to India
  }

  /**
   * Main normalization function
   * @param {string} phone - Phone number in any format
   * @param {string} defaultCountry - Default country code (default: 'IN')
   * @returns {string|null} - Normalized phone number in E.164 format or null if invalid
   */
  normalize(phone, defaultCountry = this.defaultCountry) {
    if (!phone || typeof phone !== 'string') {
      return null;
    }

    // Skip if it's not a phone number (like 'ai', 'system', etc.)
    if (this.isNotPhoneNumber(phone)) {
      return null;
    }

    // Check for incomplete phone numbers (just country codes)
    if (this.isIncompletePhoneNumber(phone)) {
      console.warn(`Incomplete phone number detected (just country code): ${phone}`);
      return null;
    }

    // Clean the phone number
    let cleaned = this.cleanPhoneNumber(phone);
    if (!cleaned) {
      return null;
    }

    // Normalize based on patterns
    const normalized = this.normalizeByCountry(cleaned, defaultCountry);
    
    // Validate the final result
    if (!this.isValidPhoneNumber(normalized)) {
      console.warn(`Invalid phone number after normalization: ${phone} -> ${normalized}`);
      return null;
    }

    return normalized;
  }

  /**
   * Check if the input is clearly not a phone number
   */
  isNotPhoneNumber(phone) {
    const lowerPhone = phone.toLowerCase();
    
    // Skip system identifiers
    if (['ai', 'system', 'bot', 'admin'].includes(lowerPhone)) {
      return true;
    }
    
    // Skip if it's clearly a name (contains only letters and spaces)
    if (/^[a-zA-Z\s]+$/.test(phone)) {
      console.log('Skipping name (not phone number):', phone);
      return true;
    }
    
    return false;
  }

  /**
   * Clean phone number by removing unwanted characters
   */
  cleanPhoneNumber(phone) {
    // Remove WhatsApp suffix
    let cleaned = phone.replace(/@c\.us$/g, '');
    
    // Remove all non-digit characters except +
    cleaned = cleaned.replace(/[^\d+]/g, '');
    
    // Remove multiple + signs, keep only the first one
    cleaned = cleaned.replace(/\++/g, '+');
    
    if (!cleaned || cleaned === '+') {
      return null;
    }
    
    return cleaned;
  }

  /**
   * Normalize phone number based on country patterns
   */
  normalizeByCountry(cleaned, defaultCountry) {
    const countryInfo = this.countryPatterns[defaultCountry];
    if (!countryInfo) {
      console.warn(`Unknown country code: ${defaultCountry}`);
      return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
    }

    // If it already starts with +, validate and fix
    if (cleaned.startsWith('+')) {
      return this.fixInternationalNumber(cleaned, countryInfo);
    }

    // If it doesn't start with +, add country code
    return this.addCountryCode(cleaned, countryInfo);
  }

  /**
   * Fix international numbers that already have +
   */
  fixInternationalNumber(phone, countryInfo) {
    const digits = phone.substring(1); // Remove +
    
    // Check if it starts with the country code
    if (digits.startsWith(countryInfo.code)) {
      const nationalNumber = digits.substring(countryInfo.code.length);
      
      // Remove leading zeros from national number
      const cleanNational = nationalNumber.replace(/^0+/, '');
      
      // Validate national number length and pattern
      if (this.isValidNationalNumber(cleanNational, countryInfo)) {
        return '+' + countryInfo.code + cleanNational;
      }
    }
    
    // If it doesn't match expected pattern, try to fix it
    return this.attemptFix(digits, countryInfo);
  }

  /**
   * Add country code to numbers without +
   */
  addCountryCode(digits, countryInfo) {
    // Remove leading zeros
    let cleanDigits = digits.replace(/^0+/, '');
    
    // If it already starts with country code, just add +
    if (cleanDigits.startsWith(countryInfo.code)) {
      const nationalNumber = cleanDigits.substring(countryInfo.code.length);
      const cleanNational = nationalNumber.replace(/^0+/, '');
      
      if (this.isValidNationalNumber(cleanNational, countryInfo)) {
        return '+' + countryInfo.code + cleanNational;
      }
    }
    
    // If it's a valid national number, add country code
    if (this.isValidNationalNumber(cleanDigits, countryInfo)) {
      return '+' + countryInfo.code + cleanDigits;
    }
    
    // Last attempt: try to extract valid national number
    return this.attemptFix(cleanDigits, countryInfo);
  }

  /**
   * Attempt to fix malformed numbers
   */
  attemptFix(digits, countryInfo) {
    // For Indian numbers, handle common issues
    if (countryInfo.code === '91') {
      // Handle +9108123133382 -> +918123133382 (remove extra 0)
      if (digits.startsWith('910') && digits.length === 13) {
        const nationalNumber = digits.substring(3); // Remove '910'
        if (this.isValidNationalNumber(nationalNumber, countryInfo)) {
          return '+91' + nationalNumber;
        }
      }
      
      // Handle other malformed patterns
      const patterns = [
        digits.replace(/^91/, ''),  // Remove country code if present
        digits.replace(/^0+/, ''),  // Remove leading zeros
        digits.substring(digits.length - 10) // Take last 10 digits
      ];
      
      for (const pattern of patterns) {
        if (this.isValidNationalNumber(pattern, countryInfo)) {
          return '+91' + pattern;
        }
      }
    }
    
    // If all attempts fail, return as is with + prefix
    return '+' + digits;
  }

  /**
   * Validate national number against country pattern
   */
  isValidNationalNumber(nationalNumber, countryInfo) {
    if (!nationalNumber || nationalNumber.length < countryInfo.minLength || nationalNumber.length > countryInfo.maxLength) {
      return false;
    }
    
    return countryInfo.pattern.test(nationalNumber);
  }

  /**
   * Final validation of the normalized phone number
   */
  isValidPhoneNumber(phone) {
    if (!phone || !phone.startsWith('+')) {
      return false;
    }
    
    const digits = phone.substring(1);
    
    // Must have at least 7 digits for international numbers
    if (digits.length < 7) {
      return false;
    }
    
    // Must contain only digits after +
    if (!/^\d+$/.test(digits)) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if a phone number is incomplete (just country code)
   */
  isIncompletePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
      return true;
    }

    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Check for common incomplete patterns
    const incompletePatterns = [
      '+91',    // Just India country code
      '+1',     // Just US country code
      '+44',    // Just UK country code
      '+86',    // Just China country code
      '+81',    // Just Japan country code
      '+49',    // Just Germany country code
      '+33',    // Just France country code
      '+39',    // Just Italy country code
      '+34',    // Just Spain country code
      '+7',     // Just Russia country code
    ];
    
    return incompletePatterns.includes(cleaned);
  }

  /**
   * Get display format for phone number
   */
  getDisplayFormat(phone) {
    const normalized = this.normalize(phone);
    if (!normalized) return phone;
    
    // For Indian numbers, format as +91 XXXXX XXXXX
    if (normalized.startsWith('+91') && normalized.length === 13) {
      const national = normalized.substring(3);
      return `+91 ${national.substring(0, 5)} ${national.substring(5)}`;
    }
    
    return normalized;
  }

  /**
   * Check if two phone numbers are the same after normalization
   */
  areEqual(phone1, phone2) {
    const norm1 = this.normalize(phone1);
    const norm2 = this.normalize(phone2);
    
    return norm1 && norm2 && norm1 === norm2;
  }
}

// Create singleton instance
const phoneNormalizer = new PhoneNormalizer();

module.exports = {
  PhoneNormalizer,
  normalize: (phone, defaultCountry) => phoneNormalizer.normalize(phone, defaultCountry),
  getDisplayFormat: (phone) => phoneNormalizer.getDisplayFormat(phone),
  areEqual: (phone1, phone2) => phoneNormalizer.areEqual(phone1, phone2),
  isValidPhoneNumber: (phone) => phoneNormalizer.isValidPhoneNumber(phone)
};