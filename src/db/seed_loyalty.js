const supabase = require('../config/supabase');
const logger = require('../utils/logger');

async function seedLuminaDerma() {
    const locationId = 'lumina-derma'; // Mock location ID for testing

    try {
        logger.info('🌱 Seeding Lumina Derma data...');

        // 1. First, ensure the location exists in ghl_integrations (dummy record)
        const { error: ghlError } = await supabase
            .from('ghl_integrations')
            .upsert([{
                location_id: locationId,
                access_token: 'mock_token',
                refresh_token: 'mock_refresh',
                expires_at: Date.now() + 3600000
            }], { onConflict: 'location_id' });

        if (ghlError) throw ghlError;

        // 2. Seed Settings
        const { error: settingsError } = await supabase
            .from('loyalty_settings')
            .upsert([{
                location_id: locationId,
                business_name: 'Lumina Derma Care',
                address: '45 Wellness Blvd, Skin City',
                phone: '+91 99999 00000',
                website: 'www.luminaderma.com',
                hours: '10:00 AM - 8:00 PM',
                primary_color: '#2dd4bf', // Teal 400
                secondary_color: '#fb7185', // Rose 400
                review_url: 'https://g.page/r/your-id/review'
            }], { onConflict: 'location_id' });

        if (settingsError) throw settingsError;

        // 3. Delete old milestones for this location first
        await supabase
            .from('loyalty_milestones')
            .delete()
            .eq('location_id', locationId);

        // 4. Seed Milestones (ONLY 3, 6, and 10)
        const milestones = [
            { location_id: locationId, visit_number: 3, reward_name: 'Expert Skin Analysis', reward_image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=100&h=100&fit=crop' },
            { location_id: locationId, visit_number: 6, reward_name: 'HydraFacial Glow', reward_image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=100&h=100&fit=crop' },
            { location_id: locationId, visit_number: 10, reward_name: 'Premium Skincare Kit', reward_image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=100&h=100&fit=crop' }
        ];

        for (const m of milestones) {
            await supabase.from('loyalty_milestones').insert([m]);
        }

        // 4. Seed a "Review for Reward" Action
        await supabase.from('loyalty_actions').upsert([{
            location_id: locationId,
            action_type: 'review',
            reward_name: 'Glow Bonus: Lip Hydra-Treat',
            action_url: 'https://g.page/r/your-id/review'
        }], { onConflict: 'location_id,action_type' });

        logger.info('✅ Seeding complete!');
    } catch (error) {
        logger.error('❌ Seeding failed', { error: error.message });
    }
}

// Run if called directly
if (require.main === module) {
    seedLuminaDerma();
}

module.exports = seedLuminaDerma;
