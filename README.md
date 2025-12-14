# CodeReforge — Rebuild Your Logic

An interactive debugging and visualization platform that forces novices to think before they run, trace before they fix, and learn by diagnosing, not by copying.

## Features

- **Predict Before You Run**: Users must predict code behavior and manually trace execution before running
- **Visual Execution**: Step-by-step visualization of code execution with variable tracking
- **Discrepancy Detection**: Highlights differences between user predictions and actual execution
- **AI-Driven Socratic Mentoring**: AI-generated questions that guide learning without giving direct answers
- **Concept Learning Cards**: Animated cards that summarize learned concepts

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Monaco Editor** - Code editing
- **Zustand** - State management
- **Radix UI** - Accessible UI components
- **Tailwind CSS** - Styling
- **Groq API** - AI mentor questions (configurable to OpenAI)
- **Lucide React** - Icons

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env.local` file in the root directory with your configuration:

**AI Provider (for mentor questions):**

**For Groq (recommended, free tier available):**

```env
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

**For OpenAI (alternative):**

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
```

> **Note**:
>
> - The AI mentor feature will work without an API key, but will use fallback questions.
> - Code execution uses static analysis for C++ and Python (simulated execution).
> - JavaScript code runs in the browser using eval().

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
codereforge/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── execute/       # Code execution endpoint
│   │   └── mentor/        # AI mentor questions endpoint
│   ├── challenge/         # Challenge pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── editor/           # Code editor components
│   ├── trace/            # Trace table and prediction form
│   ├── ui/               # Reusable UI components
│   └── visualization/   # Execution visualization
├── lib/                  # Utility libraries
│   ├── ai/              # AI mentor integration
│   ├── execution/       # Code execution and tracing
│   └── utils/           # Utility functions
├── store/               # Zustand state management
├── types/               # TypeScript type definitions
└── public/              # Static assets
```

## How It Works

1. **Predict**: User sees buggy code and must predict output and trace execution manually
2. **Run**: Once prediction is submitted, code execution is unlocked and visualized step-by-step
3. **Learn**: System highlights discrepancies and asks Socratic questions to guide understanding
4. **Fix**: User edits code to fix bugs and learns concepts through the process

## License

MIT
