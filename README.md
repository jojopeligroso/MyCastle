# ESL Learning Platform

An AI-powered learning platform for English as a Second Language (ESL) students using Model Context Protocol (MCP) architecture.

## Project Structure

```
esl-learning-platform/
├── src/
│   ├── frontend/          # Next.js frontend application
│   │   ├── src/
│   │   │   ├── app/      # Next.js App Router pages
│   │   │   ├── components/ # React components
│   │   │   ├── lib/      # Utility functions and client libraries
│   │   │   └── types/    # TypeScript type definitions
│   │   └── public/       # Static assets
│   ├── backend/          # Backend services and MCP host
│   │   ├── lib/         # Core backend logic
│   │   ├── services/    # Service layer
│   │   └── types/       # TypeScript type definitions
│   └── mcp-servers/     # MCP server implementations
├── docs/                # Documentation
├── tests/              # Test files
└── scripts/            # Utility scripts
```

## Tech Stack

- **Frontend**: Next.js 16 with TypeScript, React 19, Tailwind CSS
- **Backend**: Node.js with TypeScript, MCP SDK
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI API, Anthropic Claude (via MCP)
- **Authentication**: Supabase Auth

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- OpenAI API key
- Anthropic API key (for MCP features)

## Setup Instructions

### 1. Clone and Install

```bash
# Install frontend dependencies
cd src/frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Environment Configuration

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Update the `.env` file with your actual credentials:
- Supabase project URL and keys
- OpenAI API key
- Anthropic API key
- Other configuration values

### 3. Database Setup

Follow the database schema setup instructions in `docs/database-schema.md` to initialize your Supabase database.

### 4. Run Development Servers

```bash
# Terminal 1: Run frontend
cd src/frontend
npm run dev

# Terminal 2: Run backend (when implemented)
cd src/backend
npm run dev
```

The frontend will be available at http://localhost:3000

## Available Scripts

### Frontend (`src/frontend/`)

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Backend (`src/backend/`)

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run type-check` - Check TypeScript types

## Development Guidelines

### Code Style

- Use TypeScript strict mode
- Follow ESLint configuration
- Format code with Prettier before committing
- Use meaningful variable and function names
- Add comments for complex logic

### Git Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run linting and type checking
4. Commit with clear, descriptive messages
5. Push and create a pull request

## Architecture Overview

This platform uses the Model Context Protocol (MCP) architecture to enable modular AI capabilities:

- **Frontend**: Next.js application providing the user interface
- **Backend/MCP Host**: Manages communication between frontend and MCP servers
- **MCP Servers**: Specialized AI services for different learning features
  - Grammar checking and feedback
  - Vocabulary building
  - Conversation practice
  - Writing assistance

## Next Steps

1. Complete MCP server implementations
2. Set up Supabase database schema
3. Implement authentication flow
4. Build core learning features
5. Add tests
6. Deploy to production

## Documentation

- [Project Specification](spec.md)
- [Database Schema](docs/database-schema.md) (to be created)
- [API Documentation](docs/api.md) (to be created)
- [MCP Architecture](docs/mcp-architecture.md) (to be created)

## Contributing

Please read the development guidelines above and ensure all tests pass before submitting pull requests.

## License

[Add your license here]
