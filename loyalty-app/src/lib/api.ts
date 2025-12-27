export async function getLoyaltyData(locationId: string) {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        console.log('Fetching from:', `${baseUrl}/api/v1/loyalty/settings/${locationId}`);

        const response = await fetch(`${baseUrl}/api/v1/loyalty/settings/${locationId}`, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error('API Response not OK:', response.status, response.statusText);
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Loyalty data loaded successfully');
        return data;
    } catch (error) {
        console.error('Loyalty API error:', error);
        // Return mock data as fallback
        return {
            settings: {
                business_name: 'Lumina Derma Care',
                primary_color: '#2dd4bf',
                secondary_color: '#fb7185'
            },
            milestones: [
                { visit_number: 3, reward_name: 'Expert Skin Analysis', reward_image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=100&h=100&fit=crop' },
                { visit_number: 6, reward_name: 'HydraFacial Glow', reward_image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=100&h=100&fit=crop' },
                { visit_number: 10, reward_name: 'Premium Skincare Kit', reward_image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=100&h=100&fit=crop' }
            ],
            actions: []
        };
    }
}

export async function getCustomerData(locationId: string, contactId: string) {
    // We'll implement this once we have customer-specific routes
    return {
        visits: 4, // Mock for now until we have auth/contact context
    };
}
