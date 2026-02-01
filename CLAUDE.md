# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**IMPORTANT**: When the user clarifies details about how to run, set up, configure, or work with this codebase, always update this file to document those patterns. This ensures knowledge persists across sessions.

## Working Style

Act as a senior fullstack engineer collaborating with the user:
- Be a sounding board for ideas and architectural decisions
- Push back when you see potential issues, anti-patterns, or better alternatives
- Don't blindly agree with suggestions - provide thoughtful technical critique
- Consider tradeoffs and explain your reasoning
- Ask clarifying questions when requirements are ambiguous

## Project Overview

Co-op is an AI-powered NYC real estate search platform that uses Claude to parse natural language queries into database filters. The system combines a Next.js frontend, AWS Lambda serverless backend, and Airflow data pipelines.

## Common Commands

### Frontend (src/frontend)
```bash
npm install          # Install dependencies
npm run dev          # Development server (localhost:3000)
npm run dev:turbo    # Dev server with Turbopack
npm run build        # Build (runs prisma generate first)
npm run lint         # ESLint
```

### Backend (src/backend)
```bash
sam build            # Build Lambda functions
sam local start-api  # Local testing
sam deploy           # Deploy to AWS (uses samconfig.toml)
```

### Database
```bash
cd src/frontend
npx prisma generate  # Generate Prisma client
npx prisma studio    # Visual database browser
```

## Architecture

### Data Flow
1. **Search Query**: User enters natural language → Claude API parses to structured filters → Prisma queries PostgreSQL
2. **Data Pipeline**: Airflow DAG (daily 7 AM) → Lambda Producer → SQS → Lambda Consumers → PostgreSQL/DynamoDB

### Key Frontend Files
- `app/lib/data.ts` - Core API handler orchestrating Claude + database queries
- `app/lib/claudeQueryParser.ts` - Converts Claude JSON response to Prisma filters
- `app/lib/promptConfig.ts` - Claude system prompts for search parsing
- `app/lib/definitions.ts` - TypeScript interfaces (Property, PropertyDetails, Analytics)
- `app/context/ListingsContext.tsx` - React context for listings state and chat history

### Key Backend Files
- `template.yml` - AWS SAM template defining Lambda functions, SQS queues, DynamoDB
- `layers/aws_utils/` - Shared Lambda layer (DB sessions, secrets, logging)
- `property_data_enhancement_loaders/` - Subway proximity and POI enrichment

### Database Schema
- **PostgreSQL schemas**: `real_estate`, `real_estate_analytics`
- **Primary view**: `latest_properties_materialized` (combined current property data)
- **Fact table**: `fct_properties` (daily snapshots)
- **Dimension tables**: `dim_property_details`, `dim_property_nearest_stations`, `dim_property_nearest_pois`

### Lambda Functions
| Function | Purpose |
|----------|---------|
| GenericAPISQSProducer | Triggers property API calls to SQS |
| PropertiesAPISQSConsumer | Processes property listings from external APIs |
| PropertyDetailsAPISQSConsumer | Fetches detailed property data → DynamoDB |
| SubwayLoader | Calculates subway proximity data |
| MapboxLoader | Fetches nearby POIs |
| AnthropicBatchProcessor | Batch processes with Claude API |

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS 4, DaisyUI 5, Mapbox GL
- **Backend**: Python 3.11, AWS Lambda, SAM/CloudFormation
- **Data**: PostgreSQL (Prisma ORM), DynamoDB, Redis
- **Pipeline**: Apache Airflow
- **AI**: Claude API (@anthropic-ai/sdk)

## Development Setup

### Environment Configuration

**Frontend** (`src/frontend/.env`):
- `DATABASE_URL` - PostgreSQL connection string (RDS)
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` - Mapbox GL token
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` - AWS credentials
- `ANTHROPIC_API_KEY` - Claude API key

**Backend**: Uses AWS Secrets Manager for credentials in production.

**AWS CLI**: Configure globally with `aws configure` (region: us-east-2)

### Python Environment Best Practices

- **Global Python**: Keep minimal (just pip, virtualenv)
- **Project dependencies**: Use `src/backend/venv`
- **Activate venv**: `cd src/backend && source venv/bin/activate`
- When running Python scripts that need boto3/psycopg2, always activate venv first

### Database Queries

**SQL queries** (use psql installed globally):
```bash
cd src/frontend
DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2- | cut -d '?' -f1 | tr -d '"')
psql "$DATABASE_URL" -c "SELECT * FROM real_estate.latest_properties_materialized LIMIT 5"
```

**Python queries** (use venv):
```bash
cd src/backend
source venv/bin/activate
python script.py  # Can use psycopg2, boto3, etc.
```

### Installed Tools

- **Node.js 25.5.0** - via Homebrew
- **Python 3.11** - via Homebrew (`/opt/homebrew/bin/python3.11`)
- **PostgreSQL 17 client** - via Homebrew (psql only, not server)
- **AWS SAM CLI** - via Homebrew
- **AWS CLI** - via Homebrew
