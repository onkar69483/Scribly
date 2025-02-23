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
        this.currentTool = 'brush'; // brush, highlight, shapes, text
        this.currentShape = 'rectangle'; // rectangle, circle, line, arrow
        this.shapeStart = null; // for shape drawing
        this.tempCanvas = null; // for temporary drawing while creating shapes
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
        document.addEventListener('keydown', (e) => {
            // Only process shortcuts if not in an input or textarea
            if (!['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) {
                // Toggle drawing mode with Ctrl+N
                if (e.ctrlKey && e.key.toLowerCase() === 'v') {
                    e.preventDefault(); // Prevent browser's "New window" action
                    this.toggleDrawingMode();
                }
                
                // Use Ctrl+D to start drawing
                if (e.ctrlKey && e.key.toLowerCase() === 'd' && this.isDrawingMode) {
                    e.preventDefault(); // Prevent browser's "Bookmark" action
                    this.isDKeyPressed = true;
                    if (this.currentTool === 'brush' || this.currentTool === 'highlight') {
                        this.startDrawingIfMouseOnCanvas();
                    } else if (this.currentTool === 'shape' && this.mousePosition) {
                        // Initialize shape drawing
                        const rect = this.canvas.getBoundingClientRect();
                        this.shapeStart = {
                            x: this.mousePosition.x - rect.left,
                            y: this.mousePosition.y - rect.top
                        };
                        
                        // Initialize temp canvas for shape preview
                        this.tempCanvas = document.createElement('canvas');
                        this.tempCanvas.width = this.canvas.width;
                        this.tempCanvas.height = this.canvas.height;
                        const tempCtx = this.tempCanvas.getContext('2d');
                        tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
                        tempCtx.drawImage(this.canvas, 0, 0);
                    }
                }
                
                // Quick tool selection shortcuts with Ctrl
                if (this.isDrawingMode && e.ctrlKey) {
                    switch (e.key.toLowerCase()) {
                        case 'b': 
                            e.preventDefault();
                            this.setTool('brush'); 
                            break;
                        case 'h': 
                            e.preventDefault();
                            this.setTool('highlight'); 
                            break;
                        case 's': 
                            e.preventDefault();
                            this.setTool('shape'); 
                            break;
                        case 'x': 
                            e.preventDefault();
                            this.setTool('text'); 
                            break;
                    }
                }
                
                // Keep ESC key without modifier to exit drawing mode
                if (e.key === 'Escape' && this.isDrawingMode) {
                    this.exitDrawingMode();
                }
            }
        });
    
        // Handle key up to stop drawing
        document.addEventListener('keyup', (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'd') {
                this.isDKeyPressed = false;
                this.isDrawing = false;
                
                // Finalize shape if we were drawing a shape
                if (this.currentTool === 'shape' && this.shapeStart && this.tempCanvas) {
                    // The shape is already drawn on the main canvas from the last mousemove event
                    this.shapeStart = null;
                    this.tempCanvas = null; // Release the temp canvas
                }
            }
        });
        
        // Add preference system for modifier key
        this.modifierKey = 'ctrlKey'; // Default modifier
        
        // Method to change modifier key preference
        this.setModifierKey = (key) => {
            if (['ctrlKey', 'shiftKey', 'altKey', 'metaKey'].includes(key)) {
                this.modifierKey = key;
            }
        };
    }

    setTool(tool) {
        this.currentTool = tool;
        
        // Update UI to reflect selected tool
        document.querySelectorAll('.tool-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.tool-button[data-tool="${tool}"]`)?.classList.add('active');
        
        // Show shape selector if shape tool selected
        if (tool === 'shape') {
            document.querySelector('.shape-selector-container').classList.add('visible');
        } else {
            document.querySelector('.shape-selector-container').classList.remove('visible');
        }
        
        // Show right opacity slider for highlight tool
        if (tool === 'highlight') {
            this.ctx.globalAlpha = 0.4;
        } else {
            this.ctx.globalAlpha = 1.0;
        }
        
        // Update cursor
        this.updateCursor();
    }

    setShape(shape) {
        this.currentShape = shape;
        
        // Update UI to reflect selected shape
        document.querySelectorAll('.shape-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.shape-button[data-shape="${shape}"]`)?.classList.add('active');
    }

    updateCursor() {
        if (!this.canvas) return;
        
        switch (this.currentTool) {
            case 'brush':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'highlight':
                this.canvas.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffff00\' stroke-width=\'2\'%3E%3Cpath d=\'M9.615 20L19 10.615 13.385 5 4 14.385V20h5.615z\'/%3E%3Cline x1=\'16\' y1=\'8\' x2=\'20\' y2=\'12\'/%3E%3C/svg%3E") 0 24, auto';
                break;
            case 'shape':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'text':
                this.canvas.style.cursor = 'text';
                break;
            default:
                this.canvas.style.cursor = 'default';
        }
    }

    startDrawingIfMouseOnCanvas() {
        // Check if mouse is currently over the canvas
        if (this.mousePosition && this.isDKeyPressed && this.isDrawingMode) {
            this.isDrawing = true;
            this.lastPosition = null;
            
            if (this.currentTool === 'shape') {
                // Initialize shape drawing
                const rect = this.canvas.getBoundingClientRect();
                this.shapeStart = {
                    x: this.mousePosition.x - rect.left,
                    y: this.mousePosition.y - rect.top
                };
                
                // Initialize temp canvas for shape preview
                if (!this.tempCanvas) {
                    this.tempCanvas = document.createElement('canvas');
                    this.tempCanvas.width = this.canvas.width;
                    this.tempCanvas.height = this.canvas.height;
                }
                const tempCtx = this.tempCanvas.getContext('2d');
                tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
                tempCtx.drawImage(this.canvas, 0, 0);
            } else {
                // Start drawing at current mouse position for brush
                this.handleMouseMove({
                    clientX: this.mousePosition.x,
                    clientY: this.mousePosition.y
                });
            }
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
        drawButton.setAttribute('title', 'Draw on video (Press Ctrl+V)');
        drawButton.innerHTML = `
            <svg height="100%" version="1.1" viewBox="0 0 24 24" width="100%">
                <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34c-.39-.39-1.02-.39-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z"
                     fill="#ffffff"></path>
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
        
        // Create sidebar
        this.sidebar = document.createElement('div');
        this.sidebar.className = 'youtube-drawing-sidebar';
        this.sidebar.innerHTML = `
            <div class="sidebar-header">
                <div class="sidebar-title">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <path d="M20.71 4.63l-1.34-1.34c-.39-.39-1.02-.39-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41zM7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3z" 
                            fill="currentColor"></path>
                    </svg>
                    <h3>Drawing Tools</h3>
                </div>
                <button id="closeDrawingSidebar" class="close-btn" title="Close sidebar">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                            fill="currentColor"></path>
                    </svg>
                </button>
            </div>
            
            <div class="tool-selector">
                <h4>Tools</h4>
                <div class="tool-buttons">
                    <button class="tool-button active" data-tool="brush" title="Brush Tool (Ctrl+B)">
                        <svg viewBox="0 0 24 24" width="22" height="22">
                            <path d="M20.71 4.63l-1.34-1.34c-.39-.39-1.02-.39-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z"
                                fill="currentColor"></path>
                        </svg>
                        <span>Brush</span>
                    </button>
                    <button class="tool-button" data-tool="highlight" title="Highlighter Tool (Ctrl+H)">
                        <svg viewBox="0 0 24 24" width="22" height="22">
                            <path d="M18.5 1.15c-.53 0-1.04.19-1.43.58l-5.81 5.82 5.65 5.65 5.82-5.81c.77-.78.77-2.05 0-2.83l-2.84-2.84c-.39-.39-.89-.57-1.39-.57zM10.3 8.5l-4.7 4.7.7.7L2 18v3h3l4.11-4.1.71.71 4.7-4.7-4.22-4.41z"
                                fill="currentColor"></path>
                        </svg>
                        <span>Highlight</span>
                    </button>
                    <button class="tool-button" data-tool="shape" title="Shape Tool (Ctrl+S)">
                        <svg viewBox="0 0 24 24" width="22" height="22">
                            <path d="M4.5 5.5h5v2h-5v-2zm7 2h7v-2h-7v2zm-7 4h9v-2h-9v2zm11 0h3v-2h-3v2zm-11 4h7v-2h-7v2zm9 0h5v-2h-5v2zm-9 4h9v-2h-9v2zm11 0h3v-2h-3v2z"
                                fill="currentColor"></path>
                        </svg>
                        <span>Shapes</span>
                    </button>
                    <button class="tool-button" data-tool="text" title="Text Tool (Ctrl+X)">
                        <svg viewBox="0 0 24 24" width="22" height="22">
                            <path d="M5 4v3h5.5v12h3V7H19V4z" fill="currentColor"></path>
                        </svg>
                        <span>Text</span>
                    </button>
                </div>
            </div>
            
            <div class="shape-selector-container">
                <h4>Shapes</h4>
                <div class="shape-buttons">
                    <button class="shape-button active" data-shape="rectangle" title="Rectangle">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <rect x="3" y="3" width="18" height="18" rx="1" 
                                fill="none" stroke="currentColor" stroke-width="2"></rect>
                        </svg>
                    </button>
                    <button class="shape-button" data-shape="circle" title="Circle">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <circle cx="12" cy="12" r="9" 
                                fill="none" stroke="currentColor" stroke-width="2"></circle>
                        </svg>
                    </button>
                    <button class="shape-button" data-shape="line" title="Line">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <line x1="3" y1="21" x2="21" y2="3" 
                                stroke="currentColor" stroke-width="2"></line>
                        </svg>
                    </button>
                    <button class="shape-button" data-shape="arrow" title="Arrow">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path d="M5 19l14-14m0 0h-10m10 0v10" 
                                fill="none" stroke="currentColor" stroke-width="2"></path>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="color-picker-container">
                <h4>Color</h4>
                <div class="color-palette">
                    <button class="color-option selected" data-color="#f03e3e" style="background-color: #f03e3e"></button>
                    <button class="color-option" data-color="#1971c2" style="background-color: #1971c2"></button>
                    <button class="color-option" data-color="#2f9e44" style="background-color: #2f9e44"></button>
                    <button class="color-option" data-color="#f59f00" style="background-color: #f59f00"></button>
                    <button class="color-option" data-color="#ffffff" style="background-color: #ffffff"></button>
                    <button class="color-option" data-color="#222222" style="background-color: #222222"></button>
                    <button class="color-option" data-color="#9c36b5" style="background-color: #9c36b5"></button>
                    <button class="color-option" data-color="#ff8500" style="background-color: #ff8500"></button>
                    <input type="color" id="drawingColor" value="#3498db" title="Custom color">
                </div>
            </div>
            
            <div class="size-slider-container">
                <h4>Brush Size</h4>
                <div class="slider-wrapper">
                    <span class="size-min">1px</span>
                    <input type="range" id="drawingSize" min="1" max="20" value="5">
                    <span class="size-max">20px</span>
                </div>
                <div class="size-preview-container">
                    <span class="size-preview"></span>
                    <span class="size-value">5px</span>
                </div>
            </div>
            
            <div class="modifier-key-selector">
                <h4>Modifier Key</h4>
                <select id="modifierKeySelect">
                    <option value="ctrlKey" selected>Ctrl</option>
                    <option value="shiftKey">Shift</option>
                    <option value="altKey">Alt</option>
                    <option value="metaKey">Meta (⌘)</option>
                </select>
            </div>
            
            <div class="action-buttons">
                <button id="saveDrawing" class="action-btn save-btn" title="Save Drawing">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" 
                            fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <polyline points="17 21 17 13 7 13 7 21" 
                            stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Save
                </button>
                <button id="clearDrawing" class="action-btn clear-btn" title="Clear Canvas">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>
                        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Clear
                </button>
                <button id="removeDrawing" class="action-btn remove-btn" title="Remove Drawing">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path d="M3 6h18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" 
                            stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Delete
                </button>
            </div>
            
            <div class="drawing-help">
                <div class="help-title">Keyboard Shortcuts</div>
                <div class="keyboard-shortcuts">
                    <div class="shortcut-item">
                        <span class="key"><span class="modifier">Ctrl</span>+N</span>
                        <span>Toggle drawing</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="key"><span class="modifier">Ctrl</span>+D</span>
                        <span>Hold to draw</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="key"><span class="modifier">Ctrl</span>+B</span>
                        <span>Brush tool</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="key"><span class="modifier">Ctrl</span>+H</span>
                        <span>Highlight tool</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="key"><span class="modifier">Ctrl</span>+S</span>
                        <span>Shape tool</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="key">ESC</span>
                        <span>Exit drawing</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add elements to the DOM
        videoContainer.appendChild(this.canvas);
        document.body.appendChild(this.sidebar);
        
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
        // Canvas mouse events
        // Update this part in the setupEventListeners function
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePosition = {
                x: e.clientX,
                y: e.clientY
            };
            
            if (this.isDrawingMode) {
                if (this.isDKeyPressed) {
                    if (this.currentTool === 'brush' || this.currentTool === 'highlight') {
                        this.isDrawing = true;
                        this.handleMouseMove(e);
                    } else if (this.currentTool === 'shape' && this.shapeStart) {
                        this.drawShapePreview(e);
                    }
                }
                
                // For text tool, show text cursor even without D key
                if (this.currentTool === 'text') {
                    this.canvas.style.cursor = 'text';
                }
            }
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.isDrawingMode && this.currentTool === 'text' && !this.isDKeyPressed) {
                this.addTextAtPosition(e);
            }
        });
        
        this.canvas.addEventListener('mouseenter', (e) => {
            if (this.isDrawingMode && this.isDKeyPressed) {
                this.isDrawing = true;
                this.lastPosition = null;
                
                if (this.currentTool === 'shape') {
                    const rect = this.canvas.getBoundingClientRect();
                    this.shapeStart = {
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                    };
                }
            }
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.isDrawing = false;
        });
        
        // Setup modifier key preference
        this.modifierKey = 'ctrlKey'; // Default to Ctrl key
        
        // Add handler for modifier key selection
        const modifierKeySelect = document.getElementById('modifierKeySelect');
        modifierKeySelect.addEventListener('change', (e) => {
            this.modifierKey = e.target.value;
            
            // Update the displayed shortcuts in the help section
            const modifierElements = document.querySelectorAll('.shortcut-item .modifier');
            const modifierText = e.target.options[e.target.selectedIndex].text;
            modifierElements.forEach(el => {
                el.textContent = modifierText;
            });
            
            // Update tooltips on tool buttons
            document.querySelector('[data-tool="brush"]').title = `Brush Tool (${modifierText}+B)`;
            document.querySelector('[data-tool="highlight"]').title = `Highlighter Tool (${modifierText}+H)`;
            document.querySelector('[data-tool="shape"]').title = `Shape Tool (${modifierText}+S)`;
            document.querySelector('[data-tool="text"]').title = `Text Tool (${modifierText}+X)`;
        });

        // Tool selection
        const toolButtons = document.querySelectorAll('.tool-button');
        toolButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tool = e.currentTarget.dataset.tool;
                this.setTool(tool);
            });
        });
        
        // Shape selection
        const shapeButtons = document.querySelectorAll('.shape-button');
        shapeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const shape = e.currentTarget.dataset.shape;
                this.setShape(shape);
            });
        });
        
        // Color selection
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                this.currentColor = e.target.dataset.color;
                document.getElementById('drawingColor').value = this.currentColor;
                this.updateSizePreview();
                
                // Highlight selected color
                colorOptions.forEach(btn => btn.classList.remove('selected'));
                e.target.classList.add('selected');
            });
        });
        
        const colorPicker = document.getElementById('drawingColor');
        colorPicker.addEventListener('input', (e) => {
            this.currentColor = e.target.value;
            this.updateSizePreview();
            
            // Remove highlight from preset colors
            colorOptions.forEach(btn => btn.classList.remove('selected'));
        });
        
        // Size slider
        const sizeSlider = document.getElementById('drawingSize');
        sizeSlider.addEventListener('input', (e) => {
            this.lineWidth = parseInt(e.target.value);
            this.updateSizePreview();
            document.querySelector('.size-value').textContent = `${this.lineWidth}px`;
        });
        
        // Action buttons
        document.getElementById('saveDrawing').addEventListener('click', () => this.saveDrawing());
        document.getElementById('clearDrawing').addEventListener('click', () => this.clearCanvas());
        document.getElementById('removeDrawing').addEventListener('click', () => this.removeCurrentDrawing());
        document.getElementById('closeDrawingSidebar').addEventListener('click', () => this.exitDrawingMode());
        
        // Initialize size preview
        this.updateSizePreview();
        
        // Video timeupdate event
        this.video.addEventListener('timeupdate', () => this.handleTimeUpdate());
    }

    addTextAtPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Create input element for text entry
        const textInput = document.createElement('textarea');
        textInput.className = 'drawing-text-input';
        textInput.style.left = `${e.clientX}px`;
        textInput.style.top = `${e.clientY}px`;
        textInput.style.color = this.currentColor;
        textInput.style.fontSize = `${this.lineWidth * 3}px`;
        document.body.appendChild(textInput);
        
        textInput.focus();
        
        // Add text when input is complete
        const finalizeText = () => {
            const text = textInput.value.trim();
            if (text) {
                this.ctx.font = `${this.lineWidth * 3}px Arial, sans-serif`;
                this.ctx.fillStyle = this.currentColor;
                this.ctx.textBaseline = 'top';
                
                const lines = text.split('\n');
                const lineHeight = this.lineWidth * 3 * 1.2;
                
                lines.forEach((line, index) => {
                    this.ctx.fillText(line, x, y + (index * lineHeight));
                });
            }
            textInput.remove();
        };
        
        textInput.addEventListener('blur', finalizeText);
        textInput.addEventListener('keydown', (evt) => {
            if (evt.key === 'Enter' && evt.shiftKey === false) {
                evt.preventDefault();
                finalizeText();
            }
            if (evt.key === 'Escape') {
                textInput.remove();
            }
        });
    }

    drawShapePreview(e) {
        if (!this.shapeStart) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const currentPosition = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Create temp canvas if it doesn't exist
        if (!this.tempCanvas) {
            this.tempCanvas = document.createElement('canvas');
            this.tempCanvas.width = this.canvas.width;
            this.tempCanvas.height = this.canvas.height;
            const tempCtx = this.tempCanvas.getContext('2d');
            tempCtx.drawImage(this.canvas, 0, 0);
        }
        
        // Clear the main canvas and redraw from temp canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.tempCanvas, 0, 0);
        
        // Draw the shape preview
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.fillStyle = 'transparent';
        
        switch (this.currentShape) {
            case 'rectangle':
                this.ctx.beginPath();
                this.ctx.rect(
                    this.shapeStart.x,
                    this.shapeStart.y,
                    currentPosition.x - this.shapeStart.x,
                    currentPosition.y - this.shapeStart.y
                );
                this.ctx.stroke();
                break;
                
            case 'circle':
                const radiusX = Math.abs(currentPosition.x - this.shapeStart.x);
                const radiusY = Math.abs(currentPosition.y - this.shapeStart.y);
                const radius = Math.max(radiusX, radiusY);
                
                this.ctx.beginPath();
                this.ctx.ellipse(
                    this.shapeStart.x,
                    this.shapeStart.y,
                    radius,
                    radius,
                    0,
                    0,
                    2 * Math.PI
                );
                this.ctx.stroke();
                break;
                
            case 'line':
                this.ctx.beginPath();
                this.ctx.moveTo(this.shapeStart.x, this.shapeStart.y);
                this.ctx.lineTo(currentPosition.x, currentPosition.y);
                this.ctx.stroke();
                break;
                
            case 'arrow':
                // Draw line
                this.ctx.beginPath();
                this.ctx.moveTo(this.shapeStart.x, this.shapeStart.y);
                this.ctx.lineTo(currentPosition.x, currentPosition.y);
                this.ctx.stroke();
                
                // Draw arrowhead
                const angle = Math.atan2(
                    currentPosition.y - this.shapeStart.y,
                    currentPosition.x - this.shapeStart.x
                );
                const arrowHeadLength = this.lineWidth * 3;
                
                this.ctx.beginPath();
                this.ctx.moveTo(currentPosition.x, currentPosition.y);
                this.ctx.lineTo(
                    currentPosition.x - arrowHeadLength * Math.cos(angle - Math.PI/6),
                    currentPosition.y - arrowHeadLength * Math.sin(angle - Math.PI/6)
                );
                this.ctx.moveTo(currentPosition.x, currentPosition.y);
                this.ctx.lineTo(
                    currentPosition.x - arrowHeadLength * Math.cos(angle + Math.PI/6),
                    currentPosition.y - arrowHeadLength * Math.sin(angle + Math.PI/6)
                );
                this.ctx.stroke();
                break;
        }
    }

    updateSizePreview() {
        const preview = document.querySelector('.size-preview');
        preview.style.width = `${this.lineWidth}px`;
        preview.style.height = `${this.lineWidth}px`;
        preview.style.backgroundColor = this.currentColor;
    }

    handleMouseMove(e) {
        if (!this.isDrawing || !this.isDrawingMode) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        if (!this.lastPosition) {
            this.lastPosition = { x: currentX, y: currentY };
            return;
        }

        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Set different settings for highlight tool
        if (this.currentTool === 'highlight') {
            this.ctx.lineWidth = this.lineWidth * 3;
            this.ctx.globalAlpha = 0.4;
        } else {
            this.ctx.globalAlpha = 1.0;
        }
        
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastPosition.x, this.lastPosition.y);
        this.ctx.lineTo(currentX, currentY);
        this.ctx.stroke();
        
        this.lastPosition = { x: currentX, y: currentY };
    }

    resizeCanvas() {
        if (!this.video || !this.canvas) return;
        
        const videoRect = this.video.getBoundingClientRect();
        this.canvas.width = videoRect.width;
        this.canvas.height = videoRect.height;
        
        // Position canvas exactly over video
        // this.canvas.style.top = `${videoRect.top}px`;
        // this.canvas.style.left = `${videoRect.left}px`;
        
        // Position sidebar
        if (this.sidebar) {
            this.sidebar.style.top = `${videoRect.top}px`;
            this.sidebar.style.height = `${videoRect.height}px`;
            this.sidebar.style.right = `0`; // Change from dynamic positioning to fixed at extreme right
        }
        
        // Recreate any saved drawings
        if (this.currentVideoId && this.drawings.has(this.video.currentTime)) {
            const drawing = this.drawings.get(this.video.currentTime);
            if (drawing.videoId === this.currentVideoId && drawing.imageData) {
                // We need to scale the imageData to match the new canvas size
                try {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = drawing.width;
                    tempCanvas.height = drawing.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.putImageData(drawing.imageData, 0, 0);
                    
                    this.ctx.drawImage(
                        tempCanvas, 
                        0, 0, drawing.width, drawing.height,
                        0, 0, this.canvas.width, this.canvas.height
                    );
                } catch (e) {
                    console.error('Failed to restore drawing:', e);
                }
            }
        }
    }

    toggleDrawingMode() {
        this.isDrawingMode = !this.isDrawingMode;
        
        if (this.isDrawingMode) {
            document.body.classList.add('youtube-drawing-active');
            this.canvas.style.pointerEvents = 'auto';
            this.sidebar.classList.add('visible');
            this.updateCursor();
        } else {
            this.exitDrawingMode();
        }
        
        // Update button appearance
        const drawButton = document.querySelector('.drawing-toggle-btn');
        if (drawButton) {
            if (this.isDrawingMode) {
                drawButton.classList.add('active');
            } else {
                drawButton.classList.remove('active');
            }
        }
    }

    exitDrawingMode() {
        this.isDrawingMode = false;
        document.body.classList.remove('youtube-drawing-active');
        this.canvas.style.pointerEvents = 'none';
        this.sidebar.classList.remove('visible');
        this.isDrawing = false;
        this.canvas.style.cursor = 'default';
        
        // Update button appearance
        const drawButton = document.querySelector('.drawing-toggle-btn');
        if (drawButton) {
            drawButton.classList.remove('active');
        }
    }
    
    handleTimeUpdate() {
        if (!this.video || !this.currentVideoId) return;
        
        const currentTime = Math.floor(this.video.currentTime);
        
        // Check if there's a drawing for this time
        if (this.drawings.has(currentTime)) {
            const drawing = this.drawings.get(currentTime);
            if (drawing.videoId === this.currentVideoId) {
                // Only restore if we haven't already shown this drawing
                if (this.lastShownDrawingTime !== currentTime) {
                    this.restoreDrawing(currentTime);
                    this.lastShownDrawingTime = currentTime;
                }
            }
        } else {
            // Clear canvas if moving away from a drawing
            if (this.lastShownDrawingTime !== null && 
                (currentTime < this.lastShownDrawingTime || 
                 currentTime > this.lastShownDrawingTime + 5)) {
                this.clearCanvas();
                this.lastShownDrawingTime = null;
            }
        }
    }
    
    restoreDrawing(timestamp) {
        if (!this.drawings.has(timestamp)) return;
        
        const drawing = this.drawings.get(timestamp);
        if (drawing.videoId !== this.currentVideoId || !drawing.imageData) return;
        
        this.clearCanvas();
        
        try {
            // Create a temporary canvas to handle different dimensions
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = drawing.width;
            tempCanvas.height = drawing.height;
            
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(drawing.imageData, 0, 0);
            
            // Draw the saved image on our current canvas
            this.ctx.drawImage(
                tempCanvas, 
                0, 0, drawing.width, drawing.height,
                0, 0, this.canvas.width, this.canvas.height
            );
        } catch (e) {
            console.error('Failed to restore drawing:', e);
        }
    }
    
    saveDrawing() {
        if (!this.video || !this.currentVideoId) return;
        
        const currentTime = Math.floor(this.video.currentTime);
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Check if canvas is empty
        const data = imageData.data;
        let isEmpty = true;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] !== 0) {
                isEmpty = false;
                break;
            }
        }
        
        if (isEmpty) {
            alert('Canvas is empty. Nothing to save.');
            return;
        }
        
        this.drawings.set(currentTime, {
            videoId: this.currentVideoId,
            timestamp: currentTime,
            imageData: imageData,
            width: this.canvas.width,
            height: this.canvas.height,
            startTime: Math.max(0, currentTime - 1),
            endTime: Math.min(this.video.duration, currentTime + 5)
        });
        
        // Save to localStorage
        this.saveDrawingsToStorage();
        
        // Update timeline markers
        this.updateTimelineMarkers();
        
        // Show confirmation
        this.showToast('Drawing saved at current timestamp');
    }
    
    clearCanvas() {
        if (!this.canvas || !this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    removeCurrentDrawing() {
        if (!this.video || !this.currentVideoId) return;
        
        const currentTime = Math.floor(this.video.currentTime);
        let closestTime = null;
        let minDifference = Infinity;
        
        // Find the closest drawing within ±5 seconds
        for (let time of this.drawings.keys()) {
            const difference = Math.abs(time - currentTime);
            if (difference <= 5 && difference < minDifference) {
                closestTime = time;
                minDifference = difference;
            }
        }
        
        if (closestTime !== null) {
            const confirmed = confirm(`Remove the drawing at timestamp ${closestTime}?`);
            if (confirmed) {
                this.drawings.delete(closestTime);
                this.saveDrawingsToStorage();
                this.clearCanvas();
                this.updateTimelineMarkers();
                this.lastShownDrawingTime = null;
                this.showToast('Drawing deleted');
            }
        } else {
            alert('No drawing found within ±5 seconds of the current timestamp.');
        }
    }
    
    
    saveDrawingsToStorage() {
        if (!this.currentVideoId) return;
        
        // Convert Map to array of serializable objects
        const drawingsArray = Array.from(this.drawings.entries())
            .filter(([_, drawing]) => drawing.videoId === this.currentVideoId)
            .map(([timestamp, drawing]) => {
                // Create a serializable version (imageData can't be directly stringified)
                const canvas = document.createElement('canvas');
                canvas.width = drawing.width;
                canvas.height = drawing.height;
                
                const ctx = canvas.getContext('2d');
                ctx.putImageData(drawing.imageData, 0, 0);
                
                return {
                    timestamp,
                    videoId: drawing.videoId,
                    imageDataUrl: canvas.toDataURL(),
                    width: drawing.width,
                    height: drawing.height,
                    startTime: drawing.startTime,
                    endTime: drawing.endTime
                };
            });
        
        // Store in localStorage with video ID as key
        try {
            localStorage.setItem(`youtube-drawings-${this.currentVideoId}`, 
                               JSON.stringify(drawingsArray));
            console.log(`Saved ${drawingsArray.length} drawings for video ${this.currentVideoId}`);
        } catch (e) {
            console.error('Failed to save drawings to localStorage:', e);
            this.showToast('Failed to save drawings (storage limit reached)', 'error');
        }
    }
    
    loadDrawingsFromStorage() {
        if (!this.currentVideoId) return;
        
        try {
            const storedData = localStorage.getItem(`youtube-drawings-${this.currentVideoId}`);
            if (!storedData) return;
            
            const drawingsArray = JSON.parse(storedData);
            
            // Clear existing drawings for this video
            Array.from(this.drawings.keys()).forEach(key => {
                if (this.drawings.get(key).videoId === this.currentVideoId) {
                    this.drawings.delete(key);
                }
            });
            
            // Load drawings
            drawingsArray.forEach(item => {
                // Convert image data URL back to imageData
                const img = new Image();
                img.src = item.imageDataUrl;
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = item.width;
                    canvas.height = item.height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    
                    this.drawings.set(parseInt(item.timestamp), {
                        videoId: item.videoId,
                        timestamp: parseInt(item.timestamp),
                        imageData: imageData,
                        width: item.width,
                        height: item.height,
                        startTime: item.startTime,
                        endTime: item.endTime
                    });
                    
                    // Update timeline markers after loading all drawings
                    this.updateTimelineMarkers();
                };
            });
            
            console.log(`Loaded ${drawingsArray.length} drawings for video ${this.currentVideoId}`);
        } catch (e) {
            console.error('Failed to load drawings from localStorage:', e);
        }
    }
    
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `youtube-drawing-toast ${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.add('visible');
        }, 10);
        
        // Remove after timeout
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }
}

// Initialize the drawing tool
const youtubeDrawing = new YouTubeDrawingTool();

// Add CSS styles
const styles = document.createElement('style');
styles.textContent = `
/* YouTube Drawing Tool Styles - For better readability, CSS will be in separate file */
`;
document.head.appendChild(styles);