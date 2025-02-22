// drawing.js
class YouTubeDrawingTool {
    constructor() {
        this.isDrawingMode = false;
        this.isDrawing = false;
        this.currentColor = '#3498db';
        this.lineWidth = 5;
        this.drawings = new Map();
        this.lastPosition = null;
        this.currentVideoId = null;
        this.isDKeyPressed = false;
        this.initialize();
    }

    initialize() {
        // Wait for YouTube player to load
        const checkForPlayer = setInterval(() => {
            const playerControls = document.querySelector('.ytp-right-controls');
            if (playerControls) {
                clearInterval(checkForPlayer);
                this.setupDrawingButton(playerControls);
                this.setupDrawingElements();
                this.getCurrentVideoId();
                this.loadDrawingsFromStorage();
                this.setupResizeHandler();
                this.setupKeyboardShortcuts();
            }
        }, 1000);

        // Check for video ID changes (navigation between videos)
        setInterval(() => {
            const newVideoId = this.getVideoIdFromUrl();
            if (newVideoId && newVideoId !== this.currentVideoId) {
                this.currentVideoId = newVideoId;
                this.loadDrawingsFromStorage();
                this.updateTimelineMarkers();
            }
        }, 2000);
    }

    setupKeyboardShortcuts() {
        // Use 'T' key to toggle drawing mode instead of 'D'
        document.addEventListener('keydown', (e) => {
            // Toggle drawing mode with 'T' key
            if (e.key.toLowerCase() === 't' && 
                !['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) {
                this.toggleDrawingMode();
            }
            
            // Use 'D' key press to start drawing
            if (e.key.toLowerCase() === 'd' && this.isDrawingMode && 
                !['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) {
                this.isDKeyPressed = true;
                this.startDrawingIfMouseOnCanvas();
            }
            
            // Add ESC key to exit drawing mode
            if (e.key === 'Escape' && this.isDrawingMode) {
                this.exitDrawingMode();
            }
        });

        // Handle key up to stop drawing
        document.addEventListener('keyup', (e) => {
            if (e.key.toLowerCase() === 'd') {
                this.isDKeyPressed = false;
                this.isDrawing = false;
            }
        });
    }

    startDrawingIfMouseOnCanvas() {
        // Check if mouse is currently over the canvas
        if (this.mousePosition && this.isDKeyPressed && this.isDrawingMode) {
            this.isDrawing = true;
            this.lastPosition = null;
            // Start drawing at current mouse position
            this.handleMouseMove({
                clientX: this.mousePosition.x,
                clientY: this.mousePosition.y
            });
        }
    }

    getCurrentVideoId() {
        this.currentVideoId = this.getVideoIdFromUrl();
        console.log('Current video ID:', this.currentVideoId);
    }

    getVideoIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v');
    }

    setupResizeHandler() {
        // Handle resize events for responsive drawing canvas
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.updateTimelineMarkers();
        });

        // Also handle fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            setTimeout(() => {
                this.resizeCanvas();
                this.updateTimelineMarkers();
            }, 300);
        });
    }

    setupDrawingButton(controls) {
        const drawButton = document.createElement('button');
        drawButton.className = 'ytp-button drawing-toggle-btn';
        drawButton.setAttribute('title', 'Draw on video (Press T)');
        drawButton.innerHTML = `
            <svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
                <path d="M27.7,8.2c-0.9-0.9-2.3-0.9-3.1,0l-13,13c-0.2,0.2-0.3,0.3-0.4,0.5l-2.4,5.4c-0.2,0.5-0.1,1,0.3,1.4
                c0.3,0.3,0.6,0.4,1,0.4c0.1,0,0.3,0,0.4-0.1l5.4-2.4c0.2-0.1,0.4-0.2,0.5-0.4l13-13C28.6,10.5,28.6,9.1,27.7,8.2z M12.8,24.5
                l-3,1.3l1.3-3l9.8-9.8l1.7,1.7L12.8,24.5z M24.9,12.4L23.5,11l2.3-2.3l1.4,1.4L24.9,12.4z" fill="#ffffff"></path>
            </svg>`;
        
        controls.insertBefore(drawButton, controls.firstChild);
        drawButton.addEventListener('click', () => this.toggleDrawingMode());
    }

    setupDrawingElements() {
        const videoContainer = document.querySelector('.html5-video-container');
        if (!videoContainer) return;

        // Get video element
        this.video = document.querySelector('video');
        
        // Create canvas for drawing
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'youtube-drawing-canvas';
        this.ctx = this.canvas.getContext('2d');
        
        // Create toolbar
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'youtube-drawing-toolbar';
        this.toolbar.innerHTML = `
            <div class="drawing-header">
                <span class="drawing-title">Drawing Mode</span>
                <span class="drawing-shortcut">Press ESC to exit</span>
            </div>
            <div class="drawing-controls">
                <div class="tool-section">
                    <div class="color-picker-container">
                        <div class="tool-section-label">Color</div>
                        <div class="color-palette">
                            <button class="color-option" data-color="#f03e3e" style="background-color: #f03e3e"></button>
                            <button class="color-option" data-color="#1971c2" style="background-color: #1971c2"></button>
                            <button class="color-option" data-color="#2f9e44" style="background-color: #2f9e44"></button>
                            <button class="color-option" data-color="#f59f00" style="background-color: #f59f00"></button>
                            <button class="color-option" data-color="#ffffff" style="background-color: #ffffff"></button>
                            <input type="color" id="drawingColor" value="#3498db" title="Custom color">
                        </div>
                    </div>
                    <div class="size-slider-container">
                        <div class="tool-section-label">Brush Size</div>
                        <input type="range" id="drawingSize" min="1" max="20" value="5" title="Change line width">
                        <span class="size-preview"></span>
                    </div>
                </div>
                <div class="buttons-container">
                    <button id="saveDrawing" class="action-btn save-btn" title="Save Drawing">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Save
                    </button>
                    <button id="clearDrawing" class="action-btn clear-btn" title="Clear Canvas">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Clear
                    </button>
                    <button id="removeDrawing" class="action-btn remove-btn" title="Remove Drawing">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path d="M3 6h18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Delete
                    </button>
                    <button id="exitDrawing" class="action-btn exit-btn" title="Exit Drawing Mode">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path d="M18 6L6 18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M6 6l12 12" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Exit
                    </button>
                </div>
            </div>
            <div class="drawing-instructions">
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                    <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <line x1="12" y1="8" x2="12" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Hold 'D' key and move mouse to draw
            </div>
        `;
        
        // Add elements to the DOM
        videoContainer.appendChild(this.canvas);
        document.body.appendChild(this.toolbar);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Set initial canvas size
        this.resizeCanvas();
        
        // Create timeline markers container
        this.createTimelineMarkers();
    }

    createTimelineMarkers() {
        const progressBar = document.querySelector('.ytp-progress-bar');
        if (!progressBar) return;
        
        // Create markers container
        this.markersContainer = document.createElement('div');
        this.markersContainer.className = 'youtube-drawing-markers';
        progressBar.appendChild(this.markersContainer);
    }

    updateTimelineMarkers() {
        if (!this.markersContainer) {
            this.createTimelineMarkers();
            if (!this.markersContainer) return;
        }

        // Clear existing markers
        this.markersContainer.innerHTML = '';
        
        if (!this.video || !this.currentVideoId) return;
        
        const duration = this.video.duration;
        if (!duration || isNaN(duration)) return;
        
        // Create a marker for each drawing
        this.drawings.forEach((drawing, timestamp) => {
            if (drawing.videoId !== this.currentVideoId) return;
            
            const startPercent = (drawing.startTime / duration) * 100;
            const width = ((drawing.endTime - drawing.startTime) / duration) * 100;
            
            const marker = document.createElement('div');
            marker.className = 'drawing-marker';
            marker.style.left = `${startPercent}%`;
            marker.style.width = `${width}%`;
            
            // Add tooltip with timestamp
            const formattedTime = this.formatTime(timestamp);
            marker.setAttribute('title', `Drawing at ${formattedTime}`);
            
            this.markersContainer.appendChild(marker);
        });
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    setupEventListeners() {
        // Track mouse position over canvas
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePosition = {
                x: e.clientX,
                y: e.clientY
            };
            
            if (this.isDrawingMode && this.isDKeyPressed) {
                this.isDrawing = true;
                this.handleMouseMove(e);
            }
        });
        
        this.canvas.addEventListener('mouseenter', (e) => {
            if (this.isDrawingMode && this.isDKeyPressed) {
                this.isDrawing = true;
                this.lastPosition = null;
            }
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.isDrawing = false;
        });
        
        document.addEventListener('mouseup', () => {
            // Only for regular mouse clicks, not D key drawing
            if (!this.isDKeyPressed) {
                this.isDrawing = false;
            }
        });
        
        // Toolbar controls
        const colorPicker = document.getElementById('drawingColor');
        const sizeSlider = document.getElementById('drawingSize');
        
        // Color palette buttons
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                this.currentColor = e.target.dataset.color;
                colorPicker.value = this.currentColor;
                this.updateSizePreview();
                
                // Highlight selected color
                colorOptions.forEach(btn => btn.classList.remove('selected'));
                e.target.classList.add('selected');
            });
        });
        
        colorPicker.addEventListener('input', (e) => {
            this.currentColor = e.target.value;
            this.updateSizePreview();
            
            // Remove highlight from preset colors
            colorOptions.forEach(btn => btn.classList.remove('selected'));
        });
        
        sizeSlider.addEventListener('input', (e) => {
            this.lineWidth = parseInt(e.target.value);
            this.updateSizePreview();
        });
        
        // Button handlers
        document.getElementById('saveDrawing').addEventListener('click', () => this.saveDrawing());
        document.getElementById('clearDrawing').addEventListener('click', () => this.clearCanvas());
        document.getElementById('removeDrawing').addEventListener('click', () => this.removeCurrentDrawing());
        document.getElementById('exitDrawing').addEventListener('click', () => this.exitDrawingMode());
        
        // Initialize size preview
        this.updateSizePreview();
        
        // Video timeupdate event
        this.video.addEventListener('timeupdate', () => this.handleTimeUpdate());
    }

    updateSizePreview() {
        const sizePreview = document.querySelector('.size-preview');
        if (sizePreview) {
            sizePreview.style.width = `${this.lineWidth}px`;
            sizePreview.style.height = `${this.lineWidth}px`;
            sizePreview.style.backgroundColor = this.currentColor;
        }
    }

    handleMouseMove(e) {
        if (!this.isDrawingMode || !this.isDrawing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const currentPosition = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // If this is the first point in a stroke or we're starting a new stroke
        if (!this.lastPosition) {
            this.ctx.beginPath();
            this.ctx.moveTo(currentPosition.x, currentPosition.y);
            this.lastPosition = currentPosition;
            return;
        }
        
        // Draw line from last position to current position
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastPosition.x, this.lastPosition.y);
        this.ctx.lineTo(currentPosition.x, currentPosition.y);
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();
        
        // Update last position
        this.lastPosition = currentPosition;
    }

    toggleDrawingMode() {
        this.isDrawingMode = !this.isDrawingMode;
        
        // Always pause video when entering drawing mode
        if (this.isDrawingMode) {
            this.video.pause();
        }
        
        // Show/hide canvas and toolbar
        this.canvas.classList.toggle('active', this.isDrawingMode);
        this.toolbar.classList.toggle('visible', this.isDrawingMode);
        
        if (this.isDrawingMode) {
            // Check if there's an existing drawing for this timestamp
            this.loadCurrentTimestampDrawing();
        } else {
            this.handleTimeUpdate(); // Ensure proper display after exiting drawing mode
        }
    }

    loadCurrentTimestampDrawing() {
        if (!this.video || !this.currentVideoId) return;
        
        const currentTime = Math.floor(this.video.currentTime);
        let existingDrawing = null;
        
        // Look for any drawing that covers this timestamp
        this.drawings.forEach((drawing) => {
            if (drawing.videoId === this.currentVideoId && 
                currentTime >= drawing.startTime && currentTime <= drawing.endTime) {
                existingDrawing = drawing;
            }
        });
        
        // Always clear canvas first when entering drawing mode
        this.clearCanvas();
        
        if (existingDrawing) {
            // Load existing drawing for editing
            this.displayDrawing(existingDrawing.imageData);
        }
    }

    saveDrawing() {
        if (!this.video || !this.currentVideoId) return;
        
        const timestamp = Math.floor(this.video.currentTime);
        const imageData = this.canvas.toDataURL();
        
        // Remove any existing drawings that overlap with this time window
        this.removeOverlappingDrawings(timestamp);
        
        // Store drawing with timestamp and 5-second display window
        this.drawings.set(timestamp, {
            imageData: imageData,
            startTime: timestamp,
            endTime: timestamp + 5,
            videoId: this.currentVideoId
        });
        
        // Save to localStorage
        this.saveDrawingsToStorage();
        
        // Update timeline markers
        this.updateTimelineMarkers();
        
        // Exit drawing mode
        this.exitDrawingMode();
        
        // Show confirmation
        this.showNotification('Drawing saved!');
    }

    removeOverlappingDrawings(timestamp) {
        const overlappingKeys = [];
        
        this.drawings.forEach((drawing, key) => {
            if (drawing.videoId === this.currentVideoId && 
                ((timestamp >= drawing.startTime && timestamp <= drawing.endTime) ||
                 (timestamp + 5 >= drawing.startTime && timestamp <= drawing.endTime))) {
                overlappingKeys.push(key);
            }
        });
        
        overlappingKeys.forEach(key => this.drawings.delete(key));
    }

    removeCurrentDrawing() {
        if (!this.video || !this.currentVideoId) return;
        
        const currentTime = Math.floor(this.video.currentTime);
        const drawingsToRemove = [];
        
        // Find all drawings that include this timestamp
        this.drawings.forEach((drawing, key) => {
            if (drawing.videoId === this.currentVideoId && 
                currentTime >= drawing.startTime && currentTime <= drawing.endTime) {
                drawingsToRemove.push(key);
            }
        });
        
        // Remove identified drawings
        if (drawingsToRemove.length > 0) {
            drawingsToRemove.forEach(key => this.drawings.delete(key));
            
            // Save updated storage
            this.saveDrawingsToStorage();
            
            // Update timeline markers
            this.updateTimelineMarkers();
            
            // Clear canvas
            this.clearCanvas();
            this.canvas.classList.remove('show-drawing');
            
            // Show confirmation
            this.showNotification('Drawing removed!');
            
            // Exit drawing mode if active
            if (this.isDrawingMode) {
                this.exitDrawingMode();
            }
        } else {
            this.showNotification('No drawing to remove at this timestamp.');
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'youtube-drawing-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <svg viewBox="0 0 24 24" width="20" height="20" class="notification-icon">
                    <path fill="none" stroke="currentColor" stroke-linecap="round" 
                          stroke-linejoin="round" stroke-width="2" 
                          d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline fill="none" stroke="currentColor" stroke-linecap="round" 
                              stroke-linejoin="round" stroke-width="2" 
                              points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(notification);
        
        // Remove after animation
        setTimeout(() => {
            notification.classList.add('show');
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 500);
            }, 2000);
        }, 10);
    }

    exitDrawingMode() {
        this.isDrawingMode = false;
        this.isDrawing = false;
        this.canvas.classList.remove('active');
        this.toolbar.classList.remove('visible');
        
        // Update display based on current time
        this.handleTimeUpdate();
    }

    handleTimeUpdate() {
        if (this.isDrawingMode || !this.currentVideoId) return;
        
        const currentTime = Math.floor(this.video.currentTime);
        let drawingFound = false;
        
        // Check if there's a drawing for the current timestamp and this video ID
        this.drawings.forEach((drawing) => {
            if (drawing.videoId === this.currentVideoId && 
                currentTime >= drawing.startTime && 
                currentTime <= drawing.endTime) {
                this.displayDrawing(drawing.imageData);
                this.canvas.classList.add('show-drawing');
                drawingFound = true;
            }
        });
        
        // Clear canvas if no drawing is found for current time
        if (!drawingFound) {
            this.clearCanvas();
            this.canvas.classList.remove('show-drawing');
        }
    }

    displayDrawing(imageData) {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        };
        img.src = imageData;
    }

    clearCanvas() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    resizeCanvas() {
        if (!this.video || !this.canvas) return;
        
        const videoRect = this.video.getBoundingClientRect();
        
        this.canvas.width = videoRect.width;
        this.canvas.height = videoRect.height;
    }

    getStorageKey() {
        return `youtubeDrawings_${this.currentVideoId}`;
    }

    saveDrawingsToStorage() {
        if (!this.currentVideoId) return;
        
        const drawingsForVideo = Array.from(this.drawings.entries())
            .filter(([_, drawing]) => drawing.videoId === this.currentVideoId);
            
        localStorage.setItem(this.getStorageKey(), JSON.stringify(drawingsForVideo));
    }

    loadDrawingsFromStorage() {
        if (!this.currentVideoId) return;
        
        const savedDrawings = localStorage.getItem(this.getStorageKey());
        if (savedDrawings) {
            try {
                const videoDrawings = new Map(JSON.parse(savedDrawings));
                
                // Merge with existing drawings from other videos
                this.drawings = new Map([
                    ...Array.from(this.drawings.entries())
                        .filter(([_, drawing]) => drawing.videoId !== this.currentVideoId),
                    ...videoDrawings
                ]);
                
                this.updateTimelineMarkers();
            } catch (e) {
                console.error('Failed to load drawings from storage:', e);
            }
        }
    }
}

// Initialize when the page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new YouTubeDrawingTool());
} else {
    new YouTubeDrawingTool();
}