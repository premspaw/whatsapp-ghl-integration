const { createClient } = require('@supabase/supabase-js');
const phoneNormalizer = require('../utils/phoneNormalizer');

class TenantService {
  constructor(supabase = null) {
    // Allow injection of an existing Supabase client or create one
    this.supabase = supabase || createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
    );

    // Optional static mappings via env JSON
    this.phoneMap = this.safeParseEnvJSON(process.env.TENANT_MAP_PHONE);
    this.locationMap = this.safeParseEnvJSON(process.env.TENANT_MAP_LOCATION);

    // Optional tag-based mapping
    this.tagPrefix = process.env.TENANT_TAG_PREFIX || 'Location:'; // e.g., "Location:XYZ" -> tenantId XYZ
    this.tagMap = this.safeParseEnvJSON(process.env.TENANT_TAG_MAP); // { "Location:NYC": "tenant-nyc" }

    // Simple in-memory caches with TTL
    this.cacheTTL = parseInt(process.env.TENANT_CACHE_TTL_MS || '300000'); // 5 minutes default
    this.resolvedPhoneCache = new Map(); // key: normalizedPhone -> { value, expiresAt }
    this.resolvedLocationCache = new Map(); // key: locationId -> { value, expiresAt }
  }

  safeParseEnvJSON(value) {
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch (e) {
      console.warn('⚠️ Invalid JSON in env mapping:', e.message);
      return {};
    }
  }

  getTenantIdFromRequest(req) {
    if (!req) return null;
    return (
      req.headers?.['x-tenant-id'] ||
      req.headers?.['tenant-id'] ||
      req.query?.tenantId ||
      req.body?.tenantId ||
      null
    );
  }

  async resolveTenantId({ phone = null, locationId = null, tags = null, req = null } = {}) {
    // 1) Explicit hint from request
    const hinted = this.getTenantIdFromRequest(req);
    if (hinted) return hinted;

    // 2) From location map
    if (locationId && this.locationMap && this.locationMap[locationId]) {
      return this.locationMap[locationId];
    }

    // 3) From tag mapping (e.g., "Location:XYZ" -> tenantId XYZ)
    try {
      const list = Array.isArray(tags) ? tags : [];
      if (list.length) {
        const lowerPrefix = String(this.tagPrefix || '').toLowerCase();
        for (const t of list) {
          const tagStr = String(t || '').trim();
          if (!tagStr) continue;
          // Direct map from env
          if (this.tagMap && this.tagMap[tagStr]) {
            return this.tagMap[tagStr];
          }
          // Prefix rule, case-insensitive
          if (lowerPrefix && tagStr.toLowerCase().startsWith(lowerPrefix)) {
            const tenantGuess = tagStr.substring(this.tagPrefix.length).trim();
            if (tenantGuess) return tenantGuess;
          }
        }
      }
    } catch (_) {}

    // 4) From phone map
    if (phone) {
      const normalized = phoneNormalizer.normalize(phone) || phone;
      if (this.phoneMap && this.phoneMap[normalized]) {
        return this.phoneMap[normalized];
      }
    }

    // 5) Check caches before DB lookups
    if (locationId) {
      const cachedLoc = this.getFromCache(this.resolvedLocationCache, locationId);
      if (cachedLoc) return cachedLoc;
    }
    if (phone) {
      const normalized = phoneNormalizer.normalize(phone) || phone;
      const cachedPhone = this.getFromCache(this.resolvedPhoneCache, normalized);
      if (cachedPhone) return cachedPhone;
    }

    // 6) Try Supabase tenants table by locationId
    if (locationId) {
      const t = await this.findTenantByLocation(locationId);
      if (t?.id) {
        this.setCache(this.resolvedLocationCache, locationId, t.id);
        return t.id;
      }
    }

    // 7) Try Supabase tenants table by phone
    if (phone) {
      const t = await this.findTenantByPhone(phone);
      if (t?.id) {
        const normalized = phoneNormalizer.normalize(phone) || phone;
        this.setCache(this.resolvedPhoneCache, normalized, t.id);
        return t.id;
      }
    }

    return null;
  }

  async findTenantByLocation(locationId) {
    try {
      if (!this.supabase) return null;
      // Match by external_id or metadata->>ghl_location_id
      const { data, error } = await this.supabase
        .from('tenants')
        .select('id, name, external_id, metadata')
        .or(`external_id.eq.${locationId},metadata->>ghl_location_id.eq.${locationId}`)
        .limit(1);
      if (error) throw error;
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch (e) {
      console.warn('Tenant lookup by location failed:', e.message);
      return null;
    }
  }

  async findTenantByPhone(phone) {
    try {
      if (!this.supabase) return null;
      const normalized = phoneNormalizer.normalize(phone) || phone;
      // Attempt multiple metadata keys commonly used
      const { data, error } = await this.supabase
        .from('tenants')
        .select('id, name, external_id, metadata')
        .or(
          [
            `metadata->>whatsapp_number.eq.${normalized}`,
            `metadata->>primary_phone.eq.${normalized}`,
            `metadata->>phone.eq.${normalized}`
          ].join(',')
        )
        .limit(1);
      if (error) throw error;
      if (Array.isArray(data) && data.length > 0) return data[0];

      // Fallback: if metadata contains array of numbers
      const { data: allTenants, error: e2 } = await this.supabase
        .from('tenants')
        .select('id, metadata')
        .limit(50);
      if (e2) throw e2;
      const found = (allTenants || []).find(t => {
        const numbers = (t.metadata && (t.metadata.whatsapp_numbers || t.metadata.phone_numbers)) || [];
        return Array.isArray(numbers) && numbers.includes(normalized);
      });
      return found || null;
    } catch (e) {
      console.warn('Tenant lookup by phone failed:', e.message);
      return null;
    }
  }

  // Cache helpers
  getFromCache(cache, key) {
    try {
      const entry = cache.get(key);
      if (!entry) return null;
      if (entry.expiresAt < Date.now()) {
        cache.delete(key);
        return null;
      }
      return entry.value;
    } catch (_) {
      return null;
    }
  }

  setCache(cache, key, value) {
    try {
      cache.set(key, { value, expiresAt: Date.now() + this.cacheTTL });
    } catch (_) {}
  }
}

module.exports = TenantService;