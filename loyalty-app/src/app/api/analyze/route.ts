import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const n8nWebhook = process.env.NEXT_PUBLIC_N8N_WEBHOOK || 'https://synthcoreai.app.n8n.cloud/webhook/skin-analysis';

        const image = formData.get('image');
        const locationId = formData.get('locationId');

        console.log("📂 Received Proxy Request:", {
            hasImage: !!image,
            locationId
        });

        if (!n8nWebhook) {
            console.error("❌ ERROR: NEXT_PUBLIC_N8N_WEBHOOK is not defined in Environment Variables!");
            return NextResponse.json({
                error: 'N8N Webhook URL not configured',
                hint: 'Please add NEXT_PUBLIC_N8N_WEBHOOK to your Vercel Project Settings and Redeploy.'
            }, { status: 500 });
        }

        console.log("🚀 Proxying binary request to N8N:", n8nWebhook.substring(0, 15) + "...");

        const response = await fetch(n8nWebhook, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: 'N8N Analysis Failed', details: errorText }, { status: response.status });
        }

        const text = await response.text();
        if (!text) {
            console.error("❌ N8N responded with empty data.");
            return NextResponse.json({ error: 'N8N responded with empty data.' }, { status: 500 });
        }

        let rawData;
        try {
            rawData = JSON.parse(text);
        } catch (e) {
            console.error("❌ JSON Parse Error. Raw text:", text.substring(0, 100));
            return NextResponse.json({ error: 'Invalid JSON from N8N', details: text.substring(0, 500) }, { status: 500 });
        }

        // Handle N8N wrapping in array [ { ... } ]
        let data = Array.isArray(rawData) ? rawData[0] : rawData;

        // --- Enhanced Parser: Extract deep details from the text if present ---
        const reportSource = data.finalReport || data.fullReportText || data.report || data.rawData || data.analysisText;

        if (reportSource && typeof reportSource === 'string') {
            console.log("🛠️ Augmenting Structured Data from Text...");
            // ... (regex extraction logic continues)
            const analysis: any = {};
            const areaNames = [
                { name: 'Forehead and T-Zone', key: 'Forehead' },
                { name: 'Nose and Central Face', key: 'Nose' },
                { name: 'Cheeks', key: 'Cheeks' },
                { name: 'Under-Eye Area', key: 'Eyes' },
                { name: 'Texture and Scarring', key: 'Texture' }
            ];

            areaNames.forEach((area, index) => {
                const areaNum = index + 1;
                const sectionRegex = new RegExp(`${areaNum}\\.\\s*${area.name}[\\s\\S]*?(?=${areaNum + 1}\\.\\s|FINAL SCORECARD|OVERALL TREATMENT|DISCLAIMER|$)`, 'i');
                const sectionMatch = reportSource.match(sectionRegex);

                if (sectionMatch) {
                    const sectionText = sectionMatch[0];
                    const obsRegex = /Observed:\s*([\s\S]*?)(?=\n\s*(?:AI Interpretation|Skin Health Score|Severity|What is Good|Needs Improvement)|$)/i;
                    const intRegex = /AI Interpretation:\s*([\s\S]*?)(?=\n\s*(?:Skin Health Score|Severity|What is Good|Needs Improvement)|$)/i;
                    const sevRegex = /Severity:\s*([\s\S]*?)(?=\n\s*(?:What is Good|Needs Improvement|$))/i;

                    const obsMatch = sectionText.match(obsRegex);
                    const intMatch = sectionText.match(intRegex);
                    const sevMatch = sectionText.match(sevRegex);
                    if (obsMatch || intMatch) {
                        analysis[area.key] = {
                            observed: obsMatch ? obsMatch[1].trim() : "Analysis pending...",
                            interpretation: intMatch ? intMatch[1].trim() : "Interpreting results...",
                            severity: sevMatch ? sevMatch[1].split('\n')[0].trim() : "Mild"
                        };
                    }
                }
            });

            if (Object.keys(analysis).length === 0) {
                const genericRegex = /([A-Za-z\s&]+)\nObserved:\s*([\s\S]*?)\nAI Interpretation:\s*([\s\S]*?)\nSeverity:\s*([^\n]*)/gi;
                let match;
                while ((match = genericRegex.exec(reportSource)) !== null) {
                    const key = match[1].trim();
                    if (!analysis[key]) {
                        analysis[key] = {
                            observed: match[2].trim(),
                            interpretation: match[3].trim(),
                            severity: match[4].trim()
                        };
                    }
                }
            }
            data.deepAnalysis = analysis;
        }

        // --- Fallback Summary Generator ---
        if (!data.summary) {
            console.log("🛠️ Generating Fallback Summary from Scorecard...");
            const scores = data.scorecard || {};
            const focus = Object.entries(scores)
                .filter(([_, val]: [string, any]) => {
                    if (!val) return false;
                    const v = typeof val === 'number' ? val : (val.value ?? 0);
                    return v > 20;
                })
                .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1));

            const strengths = Object.entries(scores)
                .filter(([_, val]: [string, any]) => {
                    if (!val) return true;
                    const v = typeof val === 'number' ? val : (val.value ?? 0);
                    return v <= 20;
                })
                .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1));

            data.summary = {
                overallCondition: focus.length > 0
                    ? `Focusing on ${focus.slice(0, 2).join(' & ')} management.`
                    : "Your skin barrier appears strong and well-maintained.",
                strongestAreas: strengths.length > 0 ? strengths : ["Skin Texture"],
                needsFocus: focus.length > 0 ? focus : ["Preventative Care"]
            };
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("❌ Proxy Error Details:", error.message);

        // Write to file for debugging if terminal is inaccessible
        try {
            const fs = require('fs');
            const path = require('path');
            const logPath = path.join(process.cwd(), '..', 'data', 'proxy_logs.txt');
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] ERROR: ${error.message}\n${error.stack}\n\n`);
        } catch (e) {
            console.error("Could not write to log file", e);
        }

        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
