# GetCovered Assessment - Authentication Form Detector

A Next.js application that analyzes websites to detect authentication forms. The app scrapes HTML content, identifies login/signup forms, and provides an analysis of its structure and input elements.

## 🚀 Features

### Core Functionality
- **URL Analysis**: Submit up to 5 URLs for authentication form detection
- **HTML Scraping**: Fetches and parses website HTML content
- **Authentication Detection**: Identifies login/signup forms and input elements
- **Input Analysis**: Categorizes and displays form inputs (text, password, email, etc.)
- **Real-time Validation**: URL validation with immediate feedback
- **State Persistence**: Maintains URL list across browser sessions

### Advanced Features
- **CORS Handling**: Proper cross-origin request handling
- **Browser Emulation**: Multiple user agents and headers to bypass anti-bot measures
- **Syntax Highlighting**: Beautiful HTML code display with Prism.js
- **Responsive Design**: Mobile-friendly interface with fullscreen modals
- **Horizontal Scrolling**: Navigate through multiple URL results with arrow controls
- **Error Recovery**: Retry mechanisms for failed requests

## 🛠️ Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: SCSS Modules
- **HTML Parsing**: Cheerio.js
- **URL Validation**: validator.js
- **Syntax Highlighting**: Prism.js
- **HTTP Client**: Native fetch API

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd getcovered-assessment
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 How It Works

### 1. URL Input & Validation
- Enter URLs with or without protocol (auto-adds https://)
- Real-time validation feedback
- Duplicate URL prevention
- Maximum 5 URLs limit

### 2. HTML Fetching
- Server-side API route (`/api/fetch-html`)
- Multiple fetch strategies with different user agents
- Browser emulation headers to bypass restrictions
- 15-second timeout with retry logic

### 3. Authentication Detection
The parser looks for authentication forms by:
- Finding `input[type="password"]` elements
- Searching for "email" or "password" text in input attributes:
  - `name`, `id`, `placeholder`, `type`, `class`
  - `aria-label`, `aria-labelledby`, `autocomplete`
  - `data-testid`, `data-cy`, `data-test`
- Analyzing surrounding context (inputs and buttons)

### 4. Form Analysis
- **Parent Element Detection**: Finds the nearest container with multiple inputs
- **Input Categorization**: Separates password inputs from other auth-related inputs
- **Input Sorting**: Displays inputs in order: text, password, other types, hidden
- **HTML Extraction**: Captures the parent container's HTML for inspection

### 5. Results Display
- **Response Cards**: Individual cards for each analyzed URL
- **Status Indicators**: Shows "Form Detected" or "No Form Detected"
- **Authentication Component**: Expandable details with input analysis
- **HTML Preview**: Syntax-highlighted HTML with expand functionality
- **Modal Views**: Fullscreen modals for detailed analysis

### Note: HTML source code for some URLs may be unnaccessible due to guardrails and/or Javascript build scripts.