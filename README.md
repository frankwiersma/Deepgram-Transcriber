# 🎙️ Deepgram Transcriber

A modern, browser-based web application for transcribing audio and video files using Deepgram's EU API. Features a clean UI with both Simple and Advanced modes for quick transcriptions or detailed control over the transcription process.

![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)
![Express](https://img.shields.io/badge/express-4.18+-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

- **🚀 Simple Mode**: One-click transcription with automatic language detection
- **⚙️ Advanced Mode**: Full control over transcription settings
- **🌍 EU Compliance**: Uses Deepgram's EU endpoint for data privacy
- **📁 Drag & Drop**: Modern file upload with drag-and-drop support
- **🎯 Multi-format Support**: MP3, WAV, MP4, M4A, and more (up to 2GB)
- **🌐 Multi-language**: Supports English, Dutch, and mixed language detection
- **📊 Multiple Output Formats**: Plain text, JSON, WebVTT, SRT
- **🔒 Secure**: API key stored server-side, never exposed to browser
- **🐳 Docker Ready**: Easy deployment with Docker Compose

## 🖼️ Screenshots

### Simple Mode
Clean, minimal interface for quick transcriptions with automatic settings.

### Advanced Mode
Full control over language, model selection, formatting options, and output formats.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (for local development)
- Docker & Docker Compose (for containerized deployment)
- Deepgram API key ([Get one here](https://console.deepgram.com/))

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/frankwiersma/Deepgram-Transcriber.git
   cd Deepgram-Transcriber
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Deepgram API key:
   ```env
   DEEPGRAM_API_KEY=your_api_key_here
   DEEPGRAM_API_URL=https://api.eu.deepgram.com/v1/listen
   PORT=3456
   ```

4. **Start the application**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3456`

### 🐳 Docker Deployment

1. **Clone and configure**
   ```bash
   git clone https://github.com/frankwiersma/Deepgram-Transcriber.git
   cd Deepgram-Transcriber
   cp .env.example .env
   # Edit .env with your API key
   ```

2. **Build and run**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the application**
   Open `http://localhost:3456` in your browser

## 📖 Usage

### Simple Mode (Default)
1. Click or drag a file into the upload area
2. Click "Transcribe"
3. View and copy/download your transcription

**Automatic settings in Simple Mode:**
- Model: Nova-3 (latest)
- Language: Auto-detect
- Smart formatting: Enabled
- Speaker detection: Enabled

### Advanced Mode
1. Toggle to "Advanced Mode"
2. Upload your file
3. Configure options:
   - **Language**: Auto, English, Dutch, or both
   - **Model**: Nova-3, Nova-2, Base, or Enhanced
   - **Output Format**: Plain Text, JSON, WebVTT, or SRT
   - **Smart Formatting**: Toggle punctuation and formatting
   - **Utterances**: Toggle speaker identification and timestamps
4. Click "Transcribe"
5. Download in your chosen format

## 🛠️ API Configuration

The application uses Deepgram's EU endpoint by default:
```
https://api.eu.deepgram.com/v1/listen
```

To use a different region, update the `DEEPGRAM_API_URL` in your `.env` file.

## 📁 Project Structure

```
deepgram-transcriber/
├── server.js              # Express backend server
├── public/
│   ├── index.html        # Frontend UI
│   ├── style.css         # Styling
│   └── script.js         # Frontend logic
├── uploads/              # Temporary file storage
├── .env                  # Environment variables (create from .env.example)
├── .env.example          # Environment template
├── Dockerfile            # Container configuration
├── docker-compose.yml    # Docker Compose setup
└── package.json          # Dependencies
```

## 🔧 Development

### Running in Development Mode
```bash
npm run dev
```
This uses nodemon for automatic server restarts on file changes.

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `DEEPGRAM_API_KEY` | Your Deepgram API key | Required |
| `DEEPGRAM_API_URL` | Deepgram API endpoint | `https://api.eu.deepgram.com/v1/listen` |
| `PORT` | Server port | `3456` |

## 🐳 Docker Commands

```bash
# Start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Deepgram](https://www.deepgram.com/) for their excellent speech-to-text API
- Built with Express.js, Node.js, and vanilla JavaScript
- Styled with modern CSS3

## 🔗 Links

- [Deepgram Documentation](https://developers.deepgram.com/)
- [Deepgram Console](https://console.deepgram.com/)
- [Report Issues](https://github.com/frankwiersma/Deepgram-Transcriber/issues)

---

Made with ❤️ by Frank Wiersma