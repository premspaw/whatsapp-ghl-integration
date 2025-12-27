const axios = require('axios');
const ghlOAuth = require('./oauth');
const logger = require('../../utils/logger');

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

class GHLMediaService {
    /**
     * Upload a file to GHL Media Storage
     * @param {string} locationId 
     * @param {Buffer} fileBuffer 
     * @param {string} fileName 
     * @param {string} mimetype 
     * @returns {Promise<string>} Public URL of the uploaded file
     */
    async uploadFile(locationId, fileBuffer, fileName, mimetype) {
        logger.info('🛰️ Uploading file to GHL Media Storage', { locationId, fileName, mimetype });

        try {
            const accessToken = await ghlOAuth.getAccessToken(locationId);

            // Create FormData
            // Since we are in Node.js, we might need a special trick for axios or use native fetch if available
            // Axios 1.x supports native FormData in Node 18+
            const formData = new FormData();

            // Convert Buffer to Blob for native FormData
            const blob = new Blob([fileBuffer], { type: mimetype });
            formData.append('file', blob, fileName);

            const response = await axios.post(`${GHL_API_BASE}/medias/upload-file`, formData, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Version': API_VERSION,
                    // axios automatically sets content-type for FormData if not manually set
                },
                params: { locationId }
            });

            if (response.data && response.data.url) {
                logger.info('✅ File uploaded to GHL Media', { url: response.data.url, locationId });
                return response.data.url;
            }

            throw new Error('GHL Media upload did not return a URL');

        } catch (error) {
            logger.error('❌ GHL Media Upload Error', {
                locationId,
                error: error.message,
                response: error.response?.data
            });
            throw error;
        }
    }
}

module.exports = new GHLMediaService();
