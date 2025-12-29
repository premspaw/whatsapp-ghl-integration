export async function getLoyaltyData(locationId: string) {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:30001';
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
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:30001';
        const response = await fetch(`${baseUrl}/api/v1/loyalty/customer/${locationId}/${contactId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch customer: ${response.status}`);
        }

        const data = await response.json();
        return {
            visits: data.customer?.total_visits || 0,
            profile: data.customer || null
        };
    } catch (error) {
        console.error('Customer API error:', error);
        return {
            visits: 0,
        };
    }
}

export async function getSkinAnalysisHistory(locationId: string, contactId: string) {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:30001';
        const response = await fetch(`${baseUrl}/api/v1/loyalty/analysis/${locationId}/${contactId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`History fetch failed with status ${response.status}:`, errorText);
            throw new Error(`Failed to fetch history: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('History API error:', error);
        return { success: false, history: [] };
    }
}
