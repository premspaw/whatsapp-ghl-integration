const { DynamicStructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const axios = require("axios");

// Tool to search the knowledge base (Pinecone MCP Assistant)
const pineconeTool = new DynamicStructuredTool({
    name: "mcp_pinecone",
    description: "Use this tool to search the knowledge base for company information, pricing, services, and products.",
    schema: z.object({
        query: z.string().describe("The search query to find relevant information"),
    }),
    func: async ({ query }) => {
        console.log(`[Pinecone] Searching for: ${query}`);

        try {
            // Call Pinecone MCP Assistant endpoint using JSON-RPC 2.0 format
            const response = await axios.post(
                'https://prod-1-data.ke.pinecone.io/mcp/assistants/whatappdemo',
                {
                    jsonrpc: "2.0",
                    id: Date.now(),
                    method: 'tools/call',
                    params: {
                        name: 'get_context',
                        arguments: {
                            query: query
                        }
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.PINECONE_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json, text/event-stream'
                    },
                    timeout: 10000 // 10 second timeout
                }
            );

            console.log('[Pinecone] Response received');

            // Extract the context from the JSON-RPC response
            if (response.data && response.data.result && response.data.result.content) {
                // Parse the content array and extract text
                const content = response.data.result.content;
                if (Array.isArray(content)) {
                    return content.map(item => item.text || JSON.stringify(item)).join('\n');
                }
                return JSON.stringify(content);
            } else if (response.data && response.data.result) {
                return JSON.stringify(response.data.result);
            } else {
                return JSON.stringify(response.data);
            }
        } catch (error) {
            console.error('[Pinecone] Error:', error.message);
            return `Error searching knowledge base: ${error.message}`;
        }
    },
});

// Tool to access CRM data (GoHighLevel REST API)
const ghlTool = new DynamicStructuredTool({
    name: "mcp_ghl",
    description: `Access GoHighLevel CRM data including contacts, tags, pipelines, tasks, opportunities, and conversations. 
    Available actions: contacts_get-contact, contacts_create, contacts_add-tags, contacts_remove-tags, contacts_get-all-tasks, 
    opportunities_search-opportunity, opportunities_get-pipelines, conversations_get-messages.`,
    schema: z.object({
        action: z.string().describe("The GHL action to perform (e.g., 'contacts_get-contact')"),
        params: z.record(z.any()).optional().describe("Parameters for the action"),
    }),
    func: async ({ action, params = {} }) => {
        console.log(`[GHL] Calling ${action} with params:`, params);

        const baseUrl = 'https://services.leadconnectorhq.com';
        const headers = {
            'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
            'Version': '2021-07-28',
            'Accept': 'application/json'
        };
        const locationId = process.env.GHL_LOCATION_ID;

        try {
            let response;
            const config = { headers, timeout: 10000 }; // 10 second timeout

            switch (action) {
                case 'contacts_get-contact':
                    // Search contact by phone or email using the list endpoint with query param
                    if (params.phone) {
                        const query = params.phone.replace('+', '');
                        response = await axios.get(`${baseUrl}/contacts/?locationId=${locationId}&query=${query}`, config);
                    } else if (params.email) {
                        response = await axios.get(`${baseUrl}/contacts/?locationId=${locationId}&query=${params.email}`, config);
                    }
                    return JSON.stringify(response?.data?.contacts?.[0] || { message: "Contact not found" });

                case 'contacts_create':
                    if (!params.phone) return "Missing phone number";
                    // Create contact payload
                    const contactPayload = {
                        phone: params.phone,
                        firstName: params.firstName || '',
                        lastName: params.lastName || '',
                        email: params.email || '',
                        tags: Array.isArray(params.tags) ? params.tags : (params.tags ? [params.tags] : [])
                    };
                    response = await axios.post(`${baseUrl}/contacts/`, contactPayload, config);
                    return JSON.stringify(response.data);

                case 'contacts_add-tags':
                    if (!params.contactId || !params.tags) return "Missing contactId or tags";
                    response = await axios.post(`${baseUrl}/contacts/${params.contactId}/tags`, {
                        tags: Array.isArray(params.tags) ? params.tags : [params.tags]
                    }, config);
                    return JSON.stringify(response.data);

                case 'contacts_get-all-tasks':
                    if (!params.contactId) return "Missing contactId";
                    response = await axios.get(`${baseUrl}/contacts/${params.contactId}/tasks`, config);
                    return JSON.stringify(response.data);

                case 'opportunities_search-opportunity':
                    if (!params.contactId) return "Missing contactId";
                    response = await axios.get(`${baseUrl}/opportunities/search?contact_id=${params.contactId}&location_id=${locationId}`, config);
                    return JSON.stringify(response.data);

                case 'opportunities_get-pipelines':
                    response = await axios.get(`${baseUrl}/opportunities/pipelines?locationId=${locationId}`, config);
                    return JSON.stringify(response.data);

                case 'conversations_get-messages':
                    if (!params.conversationId && !params.contactId) return "Missing conversationId or contactId";
                    let convId = params.conversationId;
                    if (!convId && params.contactId) {
                        // First find conversation ID
                        const search = await axios.get(`${baseUrl}/conversations/search?contactId=${params.contactId}&locationId=${locationId}`, config);
                        convId = search.data.conversations?.[0]?.id;
                    }
                    if (!convId) return "Conversation not found";

                    response = await axios.get(`${baseUrl}/conversations/${convId}/messages`, config);
                    return JSON.stringify(response.data);

                default:
                    return `Action ${action} not supported in this version.`;
            }
        } catch (error) {
            console.error(`[GHL] Error in ${action}:`, error.message);
            if (error.response) {
                if (error.response.status === 401) {
                    return `Error: Permission denied for ${action}. Please enable the required scope in GoHighLevel API settings.`;
                }
                return `Error accessing GHL: ${JSON.stringify(error.response.data)}`;
            }
            return `Error accessing GHL: ${error.message}`;
        }
    },
});

module.exports = {
    pineconeTool,
    ghlTool,
};
