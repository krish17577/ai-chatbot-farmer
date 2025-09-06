# Overview

This is an AI-powered chatbot application specifically designed for farmers in India. The application provides a ChatGPT-like conversational interface that supports multiple Indian languages, multimedia file uploads, and maintains conversation history. The chatbot is built to be farmer-friendly with an intuitive interface optimized for mobile devices and uses Google's Gemini AI model to provide agricultural assistance and guidance.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built using vanilla HTML, CSS, and JavaScript with a mobile-first design approach. The interface follows a ChatGPT-like conversation layout with the following key components:

- **Single Page Application**: Uses vanilla JavaScript for dynamic content management without frameworks
- **Responsive Design**: Mobile-optimized interface with large buttons and readable fonts
- **Theme**: Farmer-friendly design with earthy green/brown color scheme
- **Component Structure**: Modular JavaScript class (`FarmerChatbot`) managing all frontend interactions

## Backend Architecture
The backend follows a simple Express.js REST API pattern:

- **Framework**: Node.js with Express.js for HTTP server
- **File Upload Handling**: Multer middleware for processing multimedia uploads (images, audio, video)
- **Static File Serving**: Express static middleware for serving uploaded files and frontend assets
- **CORS Configuration**: Configured to allow cross-origin requests for development flexibility

## Data Storage
The application uses client-side storage for conversation persistence:

- **Session Management**: In-memory conversation history during active sessions
- **Local Storage**: Browser localStorage for chat history persistence across sessions
- **File Storage**: Server-side file system storage in `/uploads` directory

## Authentication and Authorization
Currently implements basic security measures:

- **API Key Protection**: Google Gemini API key stored securely in environment variables
- **File Upload Restrictions**: File type validation and size limits (10MB max)
- **CORS Protection**: Configured CORS policy for secure cross-origin requests

## AI Integration
The application integrates with Google's Gemini AI through a secure backend proxy:

- **Model**: Uses Gemini 2.5 Flash model for fast responses
- **Context Management**: Maintains conversation history in structured format for context awareness
- **Multilingual Support**: Auto-detection and response in user's preferred language
- **Multimedia Processing**: Supports image, audio, and video file analysis

## Key Design Patterns
- **API Proxy Pattern**: Backend acts as secure proxy to hide API credentials from frontend
- **Session-based Context**: Maintains conversation state through session management
- **Progressive Enhancement**: Core functionality works without JavaScript, enhanced experience with it enabled

# External Dependencies

## Core Framework Dependencies
- **Express.js (v5.1.0)**: Web application framework for Node.js backend
- **CORS (v2.8.5)**: Cross-Origin Resource Sharing middleware
- **Multer (v2.0.2)**: Middleware for handling multipart/form-data file uploads

## AI and External Services
- **@google/generative-ai (v0.24.1)**: Official Google Gemini AI SDK for natural language processing
- **Axios (v1.11.0)**: HTTP client for making API requests
- **dotenv (v17.2.2)**: Environment variable management for secure configuration

## Development and Type Support
- **@types/node (v22.13.11)**: TypeScript type definitions for Node.js (development support)

## CDN Dependencies
- **Font Awesome (v6.4.0)**: Icon library loaded via CDN for UI icons

## Environment Configuration
- **GEMINI_API_KEY**: Required Google Gemini API key for AI functionality
- **PORT**: Optional port configuration (defaults to 5000)

The application is designed to run entirely on Replit with minimal external dependencies, making it easily deployable and maintainable.