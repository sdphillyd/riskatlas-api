// api/chat.js
const Anthropic = require('@anthropic-ai/sdk').default;

const KNOWLEDGE_BASE = `
# RiskAtlas Knowledge Base

## Overview
RiskAtlas is a risk-to-coverage intelligence platform that provides a unified, sector-aware framework for mapping organizational risks to insurance product coverage and outputting an Insurability Score.

## Core Value Proposition
- 115 industry-specific control libraries with frozen IDs
- 25-question standardized questionnaires per sector
- Crosswalk to 14 lines of business (LOBs) for full coverage mapping
- Insurability Score™ — a quantitative benchmark of organizational risk posture

## The Problem We Solve
Traditional underwriting faces systemic challenges:
1. Siloed Risk Data — applications, loss runs, and policies vary widely in format
2. Sector Blind Spots — insurers lack standardized exposure models for emerging industries
3. Coverage Gaps — insureds cannot easily verify if contractual or regulatory risks are addressed
4. Lack of Benchmarks — no common scoring system exists for cross-industry insurability

## How RiskAtlas Works

### 1. Codifies Risk at the Sector Level
- 115 sectors documented across traditional, emerging, and niche industries
- Each sector mapped into 5 control domains: Compliance, Operational Safety, Cybersecurity, Workforce, and Continuity/ESG
- Frozen Control IDs ensure consistency across time and geographies

### 2. Standardizes Data Collection
- 25-question questionnaires per sector
- Evidence types defined (audit reports, configs, contracts, training logs)
- Contractual requirements ingestion (endorsements, limits, exclusions)

### 3. Maps Risks to Insurance Products
- Coverage Mapping Matrix links each sector to 14 standard LOBs
- Ensures no exposure falls through the cracks
- Specialty/Niche column captures unusual risks (pandemic BI, political risk, kidnap & ransom)

### 4. Scores Insurability
- Weighting system per sector and control domain
- Produces an Insurability Score™ (0–100) for benchmarking
- Anonymous industry index enables market benchmarking and better capital allocation

## 14 Lines of Business (LOBs)
1. Property
2. General Liability (GL)
3. Workers' Compensation (WC)
4. Auto
5. Marine
6. Aviation
7. Cyber
8. Directors & Officers (D&O)
9. Employment Practices Liability Insurance (EPLI)
10. Errors & Omissions (E&O)
11. Environmental
12. Crime
13. Surety
14. Specialty/Niche

## Insurability Score™
The Insurability Score is calculated using:
- Overall = Σ(domain_weight_d × coverage_percent_d)
- Coverage_percent_d computed as (#controls_met / #controls_applicable)
- Evidence confidence multipliers
- Sector multipliers adjust domain weights
- Negative modifiers for high-severity exclusions

Score ranges from 0-100, with higher scores indicating better insurability.

## Benefits by Persona

### For Insurers:
- Faster, more consistent underwriting
- Better visibility into emerging risks
- Reduced accumulation risk

### For Brokers:
- Transparent coverage alignment
- Streamlined submissions
- Differentiated client insights

### For Insureds:
- Confidence in coverage adequacy
- Benchmarking against industry peers
- Improved access to favorable terms

## Technical Architecture

### Platform Components:
- Ingestion Service: Upload, virus scan, OCR, metadata extraction
- Parsing Service: ACORD/policy/loss runs/contract parsers with NER
- Questionnaire Service: Serve sector questions, store responses & evidence
- Scoring Service: Normalize, map controls, apply weights, calculate score
- Coverage Service: Return LOB mapping and gap analysis
- Export Service: PDF/CSV generation and audit reports

### Security:
- OAuth2/SSO authentication
- Role-Based Access Control (RBAC)
- TLS 1.2+ encryption in transit
- AES-256 encryption at rest
- Immutable audit logs
- PII minimization

### Data Inputs:
- ACORD applications
- Existing policies
- Supplemental applications
- Loss runs
- Contractual requirements
- Risk management documentation

### Outputs:
- Insurability Score™
- Sector control coverage report
- Coverage gap analysis
- Exportable PDF/CSV reports
- Portfolio analytics (for carriers)

## Use Cases

### For a New Submission:
1. Insured uploads documents (policies, loss runs, etc.)
2. System parses and classifies by sector
3. Insured completes 25-question questionnaire
4. Provides evidence for controls
5. System calculates Insurability Score
6. Coverage crosswalk identifies gaps
7. Report generated for broker/carrier

### For Coverage Gap Analysis:
- Compare contractual requirements against parsed policy terms
- Highlight missing endorsements, insufficient limits, or problematic exclusions
- Provide actionable recommendations

### For Portfolio Management:
- Carriers can view aggregated scores across their book
- Identify accumulation risks by sector
- Benchmark performance against industry standards

## Sectors Covered
The platform covers 115 sectors including traditional industries and emerging areas like:
- AI/Machine Learning
- Metaverse
- Hydrogen Energy
- Quantum Computing
- Carbon Capture
- Clinical Trials
- Railways
- And many more...

## Pricing & Deployment
- Pilot phase currently in progress with select brokers and carriers
- API endpoints available for integration with existing systems
- Cloud-hosted with 99.5% SLO
- Feature flags enable gradual sector rollout
`;

export default async function handler(req, res) {
  // CORS headers - Allow all origins
  const allowedOrigins = ['https://riskatlas.ai', 'http://localhost:3000', 'https://www.riskatlas.ai'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not set');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Build conversation context
    const messages = [
      ...history,
      {
        role: 'user',
        content: message
      }
    ];

    console.log('Calling Claude with message:', message);

    // Call Claude Haiku with embedded knowledge
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-20250514',
      max_tokens: 1024,
      system: `You are a helpful assistant for RiskAtlas, a risk intelligence platform for the insurance industry. 

Use the following knowledge base to answer questions accurately and conversationally. Be friendly, professional, and concise. If you don't know something, say so.

${KNOWLEDGE_BASE}

Guidelines:
- Answer questions directly and clearly
- Use specific details from the knowledge base when relevant
- Keep responses conversational but professional
- If asked about features not in the knowledge base, acknowledge the limitation
- For technical questions, you can provide detail, but keep it accessible
- Encourage users to reach out for demos or more information when appropriate`,
      messages: messages
    });

    // Extract the response text
    const assistantMessage = response.content[0].text;

    console.log('Response generated successfully');

    return res.status(200).json({
      response: assistantMessage,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
}

// Use Node.js runtime for better compatibility
export const config = {
  api: {
    bodyParser: true,
  },
};
