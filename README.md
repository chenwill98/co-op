# co-op
Pet project for cooperatively finding an apartment in NYC

## Project Structure

```
co-op/
├── src/                        # Main source code
│   ├── frontend/              # Next.js web application
│   ├── backend/               # Lambda functions and API
│   └── infrastructure/        # AWS SAM/CloudFormation templates
├── docs/                      # Documentation
├── config/                    # Shared configuration files
├── scripts/                   # Utility scripts
│   ├── deployment/           # Deployment automation
│   └── local/                # Local development utilities
├── tests/                    # Test suites
└── airflow/                  # Airflow DAGs and related code
```

## Components

### Frontend (Next.js)
- Modern web application built with Next.js 14
- Located in `src/frontend`
- Features TypeScript and Tailwind CSS

### Backend (AWS Lambda)
- Serverless functions for API endpoints
- Located in `src/backend`
- Includes data processing and API integrations

### Infrastructure
- AWS SAM templates for cloud resources
- Located in `src/infrastructure`
- Includes CloudFormation templates and configs

### Data Pipeline (Airflow)
- Airflow DAGs for data processing
- Located in `airflow/`
- Handles scheduled tasks and data workflows

## Getting Started

1. **Frontend Development**
   ```bash
   cd src/frontend
   npm install
   npm run dev
   ```

2. **Backend Development**
   ```bash
   cd src/backend
   sam build
   sam local start-api
   ```

3. **Infrastructure Deployment**
   ```bash
   cd src/infrastructure
   sam deploy
   ```

## Development Guidelines

- Frontend code follows Next.js App Router conventions
- Backend code is organized by feature/domain
- Infrastructure changes require thorough testing
- All new features should include tests

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Submit a pull request

## License

See [LICENSE](./LICENSE) file for details.
