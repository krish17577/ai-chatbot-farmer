const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS for all hosts
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.static(__dirname));

// Serve the main frontend file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/', 'audio/', 'video/'];
    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
    
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Only images, audio, and video files are allowed!'), false);
    }
  }
});

// Initialize Gemini AI
let genAI;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// Store conversation sessions in memory (in production, use a proper database)
const conversationSessions = new Map();

// System prompt for agricultural advisor
const systemPrompt = `You are an agricultural advisor for smallholder farmers in India. 
Always reply in the same language as the farmer's input. 
Give simple, step-by-step, low-cost solutions. 
Keep answers short and practical. 
If more details are needed (crop type, soil, pest symptoms), ask one simple follow-up question. 
If the farmer uploads photos/audio/video, include them in your reasoning.`;

// Chat endpoint
app.post('/api/chat', upload.array('files', 5), async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({ error: 'Gemini API key not configured. Please set GEMINI_API_KEY in your environment variables.' });
    }

    const { message, sessionId, language } = req.body;
    
    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Message and sessionId are required' });
    }

    // Get or create conversation session
    if (!conversationSessions.has(sessionId)) {
      conversationSessions.set(sessionId, []);
    }
    
    const conversation = conversationSessions.get(sessionId);
    
    // Add user message to conversation
    const userMessage = {
      role: 'user',
      content: message
    };
    
    // Handle uploaded files
    const uploadedFiles = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        uploadedFiles.push({
          filename: file.originalname,
          url: fileUrl,
          type: file.mimetype
        });
        
        // Add file info to user message
        userMessage.content += `\n\n[Uploaded file: ${file.originalname} - ${fileUrl}]`;
      }
    }
    
    conversation.push(userMessage);
    
    // Build conversation context for Gemini
    const conversationContext = conversation.map(msg => 
      `${msg.role}: ${msg.content}`
    ).join('\n\n');
    
    const fullPrompt = `${systemPrompt}\n\nConversation history:\n${conversationContext}\n\nassistant:`;
    
    // Get model
    const model = genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
    });
    
    // Generate response
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Add assistant response to conversation
    conversation.push({
      role: 'assistant',
      content: text
    });
    
    // Keep conversation history manageable (last 20 messages)
    if (conversation.length > 20) {
      conversation.splice(0, conversation.length - 20);
    }
    
    res.json({
      response: text,
      files: uploadedFiles,
      sessionId: sessionId
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat request. Please try again.',
      details: error.message 
    });
  }
});

// New chat endpoint (clears conversation history)
app.post('/api/new-chat', (req, res) => {
  const { sessionId } = req.body;
  
  if (sessionId && conversationSessions.has(sessionId)) {
    conversationSessions.delete(sessionId);
  }
  
  res.json({ success: true, message: 'New chat started' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Cache control middleware for static files
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌱 Farmer Chatbot Server running on http://0.0.0.0:${PORT}`);
  console.log(`Gemini API configured: ${!!process.env.GEMINI_API_KEY}`);
});