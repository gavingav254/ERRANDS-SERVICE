# ERRANDS SERVICE

An intelligent errand dispatcher for University of Embu students and runners, using AI to optimize campus logistics.

## Features

- **Student Portal**: Easily place errand requests.
- **Runner Dashboard**: Manage and fulfill errand requests.
- **Real-time Tracking**: Live map tracking of errand runners using Leaflet.
- **AI Integration**: Powered by Gemini for intelligent logistics and optimization.
- **Authentication**: Secure user login for students and runners.

## Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Maps**: Leaflet
- **AI**: Google Gemini API (@google/genai)
- **Build Tool**: Vite

## Setup and Installation

1. **Clone the repository.**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment Variables:**
   Create a `.env.local` file and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
4. **Run the development server:**
   ```bash
   npm run dev
   ```
5. **Open the app:**
   Navigate to `http://localhost:3000` in your browser.

## Project Structure

- `/src/components/`: Reusable UI components (Auth, Header, OrderForm, RunnerDashboard, TrackingMap).
- `/src/services/`: API services (Gemini).
- `/src/types.ts`: TypeScript interfaces and types.
