# 🎙️ Deepgram Transcriber

A modern, browser-based web application for transcribing audio and video files using Deepgram's EU API. Features a clean UI with both Simple and Advanced modes, speaker diarization, and real-time cost tracking.

![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)
![Express](https://img.shields.io/badge/express-4.18+-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

- **🚀 Simple Mode**: One-click transcription with automatic language detection
- **⚙️ Advanced Mode**: Full control over transcription settings
- **🌍 EU Compliance**: Uses Deepgram's EU endpoint (`api.eu.deepgram.com`) for data privacy
- **👥 Speaker Diarization**: Identify and label different speakers with custom names
- **💰 Cost Tracking**: Real-time transcription cost estimates based on actual API usage
- **⏱️ Duration Display**: See audio duration and formatted timestamps
- **📁 Drag & Drop**: Modern file upload with drag-and-drop support
- **🎯 Multi-format Support**: MP3, WAV, MP4, M4A, WebM, and more (up to 2GB)
- **🌐 Multi-language**: Supports English, Dutch, and mixed language detection
- **📊 Multiple Output Formats**: Plain text, JSON, WebVTT, SRT
- **🔒 Secure**: API key stored server-side, never exposed to browser
- **🐳 Docker Ready**: Easy deployment with Docker Compose
- **🔄 CI/CD**: Automatic deployment via GitHub Actions

## 🎨 Design

Beautiful modern interface featuring:
- **Purple gradient background** for a premium look
- **Smooth animations** and transitions
- **Drag & drop file upload** with visual feedback
- **Clean, intuitive controls** with Simple and Advanced modes
- **Metadata dashboard** showing duration, model, language, and cost
- **Responsive design** that works on all devices

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
   docker compose up -d --build
   ```

3. **Access the application**
   Open `http://localhost:3456` in your browser

## 📖 Usage

### Simple Mode (Default)
1. Click or drag a file into the upload area
2. Click "Transcribe"
3. View transcription with metadata (duration, cost, language)
4. Copy or download your transcription

**Automatic settings in Simple Mode:**
- Model: Nova-2 (optimized for EU region)
- Language: Auto-detect
- Smart formatting: Enabled
- Speaker timestamps: Enabled

### Advanced Mode

#### Basic Transcription
1. Toggle to "Advanced Mode"
2. Upload your file
3. Configure options:
   - **Language**: Auto, English, Dutch, or both
   - **Model**: Nova-2, Base, or Enhanced
   - **Output Format**: Plain Text, JSON, WebVTT, or SRT
   - **Smart Formatting**: Toggle punctuation and formatting
   - **Utterances**: Toggle speaker identification and timestamps
4. Click "Transcribe"

#### Speaker Diarization
1. In Advanced Mode, check "Enable Speaker Diarization"
2. Enter custom names for speakers (e.g., "John Doe", "Sarah Smith")
3. Click "+ Add Another Speaker" if you have more speakers
4. Transcribe - speakers will be labeled with your custom names
5. Results show color-coded speaker labels with timestamps

#### Cost Tracking
After transcription, view the metadata panel showing:
- **Duration**: Audio length (MM:SS format)
- **Model**: Which Deepgram model was used
- **Language**: Detected or specified language
- **Estimated Cost**: Actual cost based on API pricing
  - Nova-2: $0.0043 per minute
  - Nova-3: $0.0059 per minute (if available in your region)

## 🛠️ API Configuration

### EU Endpoint (Default)
The application is configured to use Deepgram's EU endpoint by default:
```javascript
const deepgram = createClient(process.env.DEEPGRAM_API_KEY, {
  global: {
    fetch: {
      options: {
        url: "https://api.eu.deepgram.com"
      }
    }
  }
});
```

This ensures GDPR compliance and data residency within the EU.

### Environment Variables
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DEEPGRAM_API_KEY` | Your Deepgram API key | - | Yes |
| `PORT` | Server port | `3456` | No |
| `NODE_ENV` | Environment (production/development) | `production` | No |

## 📁 Project Structure

```
deepgram-transcriber/
├── server.js              # Express backend with EU endpoint configuration
├── public/
│   ├── index.html        # Frontend UI with speaker diarization
│   ├── style.css         # Modern styling with metadata display
│   └── script.js         # Frontend logic
├── uploads/              # Temporary file storage (auto-cleaned)
├── .github/
│   └── workflows/
│       └── deploy.yml    # GitHub Actions CI/CD pipeline
├── .env                  # Environment variables (create from .env.example)
├── .env.example          # Environment template
├── Dockerfile            # Container configuration
├── docker-compose.yml    # Docker Compose setup with Traefik labels
└── package.json          # Dependencies
```

## 🔄 CI/CD Deployment

The project includes a GitHub Actions workflow that automatically:
1. Triggers on push to `main` branch
2. Connects to your Azure VM via SSH
3. Pulls latest code
4. Rebuilds Docker container with no cache
5. Restarts the application
6. Verifies container health

**Setup GitHub Actions:**
1. Add secrets to your GitHub repository:
   - `VM_HOST`: Your VM's IP address or hostname
   - `VM_USER`: SSH username (e.g., `azureuser`)
   - `VM_SSH_KEY`: SSH private key for authentication
2. Ensure your VM's Network Security Group allows SSH from GitHub Actions
3. Push to `main` branch to trigger deployment

## 🔧 Development

### Running in Development Mode
```bash
npm run dev
```
This uses nodemon for automatic server restarts on file changes.

### Testing the Application
1. Use a sample audio file with multiple speakers
2. Enable speaker diarization in Advanced Mode
3. Add speaker names: "John", "Sarah", etc.
4. After transcription, verify:
   - Speaker names appear correctly
   - Duration is displayed
   - Cost estimate is shown
   - Timestamps are accurate

## 🐳 Docker Commands

```bash
# Start the container
docker compose up -d

# View logs
docker compose logs -f deepgram-transcriber

# Check container status
docker compose ps

# Stop the container
docker compose down

# Rebuild after changes
docker compose build --no-cache
docker compose up -d

# Check health status
docker inspect deepgram-transcriber | grep -i health
```

## 🌐 Production Deployment

This application is production-ready with:
- **Traefik Integration**: Automatic HTTPS with Let's Encrypt
- **Health Checks**: Docker health monitoring
- **Auto-restart**: Container restarts on failure
- **Resource Cleanup**: Automatic file cleanup after transcription
- **Error Handling**: Comprehensive error messages

**Traefik Configuration** (in docker-compose.yml):
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.transcribe.rule=Host(`transcribe.co-evolve.nl`)"
  - "traefik.http.routers.transcribe.entrypoints=websecure"
  - "traefik.http.routers.transcribe.tls.certresolver=cloudflare"
  - "traefik.http.services.transcribe.loadbalancer.server.port=3456"
```

## 🎯 Features In Detail

### Speaker Diarization
- Automatically detects different speakers in audio
- Assigns speaker labels (Speaker 0, Speaker 1, etc.)
- Allows custom naming of speakers
- Shows speaker changes with timestamps
- Color-coded display for easy reading

### Cost Calculation
- Uses actual Deepgram API metadata
- Calculates based on audio duration
- Shows per-minute pricing model
- Updates in real-time after transcription

### Metadata Display
Comprehensive transcription information:
- **Duration**: Total audio length
- **Model**: AI model used (Nova-2, Enhanced, etc.)
- **Language**: Detected or configured language
- **Cost**: Estimated transcription cost in USD

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
- Deployed on Azure with Docker and Traefik

## 🔗 Links

- [Deepgram Documentation](https://developers.deepgram.com/)
- [Deepgram Console](https://console.deepgram.com/)
- [Deepgram EU Endpoint Docs](https://developers.deepgram.com/docs/eu-endpoint)
- [Report Issues](https://github.com/frankwiersma/Deepgram-Transcriber/issues)

## 🆕 Recent Updates

- ✅ Configured Deepgram EU endpoint for GDPR compliance
- ✅ Added speaker diarization with custom name support
- ✅ Implemented real-time cost tracking from API metadata
- ✅ Added duration display with formatted timestamps
- ✅ Set up GitHub Actions for CI/CD
- ✅ Moved to dedicated project directory
- ✅ Updated model to Nova-2 for EU region compatibility

---

Made with ❤️ by Frank Wiersma
