(function () {
    let activePopup = null;
    let hoverTimeout = null;
  
    const generateId = () => `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
    function createAnnotationButton() {
      const controls = document.querySelector(".ytp-left-controls");
      if (!controls || document.getElementById("yt-annotate-btn")) return;
  
      const button = document.createElement("button");
      button.id = "yt-annotate-btn";
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/>
        </svg>
      `;
      button.classList.add("yt-annotate-btn");
      button.title = "Add Note";
      button.onclick = toggleAnnotationPopup;
  
      controls.appendChild(button);
    }
  
    function toggleAnnotationPopup() {
      removeActivePopup();
  
      const video = document.querySelector("video");
      if (!video) return;
  
      const currentTime = video.currentTime;
  
      const popup = document.createElement("div");
      popup.id = "yt-annotation-popup";
      popup.classList.add("yt-annotation-popup");
  
      popup.innerHTML = `
        <textarea 
          id="annotation-text" 
          class="annotation-text" 
          placeholder="Add your note at ${formatTime(currentTime)}..."
        ></textarea>
        <button id="save-annotation" class="save-annotation">Save Note</button>
        <button id="close-annotation" class="close-annotation">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;
  
      document.body.appendChild(popup);
      activePopup = popup;
  
      const textarea = popup.querySelector("#annotation-text");
      textarea.focus();
  
      document.addEventListener('click', handleClickOutside);
      popup.addEventListener('click', (e) => e.stopPropagation());
  
      document.getElementById("save-annotation").onclick = () => saveAnnotation(currentTime);
      document.getElementById("close-annotation").onclick = () => removeActivePopup();
    }
  
    function showAnnotationPopup(event, marker) {
      clearTimeout(hoverTimeout);
      removeActivePopup();
  
      const popup = document.createElement("div");
      popup.classList.add("annotation-popup");
      popup.innerHTML = `
        <div style="font-weight: 500; margin-bottom: 4px; color: var(--yt-red);">
          ${marker.dataset.time}
        </div>
        <div class="annotation-content">
          ${marker.dataset.text}
        </div>
        <div class="popup-actions">
          <button class="edit-annotation">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="close-popup">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;
  
      const rect = marker.getBoundingClientRect();
      popup.style.bottom = "60px";
      popup.style.left = `${rect.left - (popup.offsetWidth / 2)}px`;
  
      document.body.appendChild(popup);
      activePopup = popup;
  
      popup.addEventListener("mouseenter", () => clearTimeout(hoverTimeout));
      popup.addEventListener("mouseleave", () => hideAnnotationPopup());
  
      popup.querySelector(".edit-annotation").onclick = () => editAnnotation(marker.dataset.id);
      popup.querySelector(".close-popup").onclick = () => removeActivePopup();
    }
  
    // Rest of the functions remain the same
    function handleClickOutside(e) {
      if (activePopup && !activePopup.contains(e.target) && 
          e.target.id !== "yt-annotate-btn") {
        removeActivePopup();
        document.removeEventListener('click', handleClickOutside);
      }
    }
  
    function formatTime(seconds) {
      const date = new Date(seconds * 1000);
      return date.toISOString().substr(11, 8);
    }
  
    function saveAnnotation(timestamp) {
      const text = document.getElementById("annotation-text").value;
  
      if (!text.trim()) {
        showNotification("Please enter some text for your note");
        return;
      }
  
      const videoId = getVideoId();
      if (!videoId) return;
  
      chrome.storage.local.get({ annotations: {} }, (data) => {
        const newAnnotation = {
          id: generateId(),
          timestamp,
          text,
          createdAt: Date.now()
        };
  
        const annotations = data.annotations[videoId] || [];
        annotations.push(newAnnotation);
  
        const updatedAnnotations = {
          ...data.annotations,
          [videoId]: annotations
        };
  
        chrome.storage.local.set({ annotations: updatedAnnotations }, () => {
          showNotification("Note saved successfully!");
          removeActivePopup();
          loadAnnotations();
        });
      });
    }
  
    function getVideoId() {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('v');
    }
  
    function showNotification(message) {
      const notification = document.createElement("div");
      notification.classList.add("yt-notification");
      notification.textContent = message;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    }
  
    function hideAnnotationPopup() {
      hoverTimeout = setTimeout(() => {
        removeActivePopup();
      }, 300);
    }
  
    function removeActivePopup() {
      if (activePopup) {
        activePopup.remove();
        activePopup = null;
      }
    }
  
    function editAnnotation(id) {
      const videoId = getVideoId();
      if (!videoId) return;
  
      chrome.storage.local.get({ annotations: {} }, (data) => {
        const annotations = data.annotations[videoId] || [];
        const annotation = annotations.find(a => a.id === id);
        if (!annotation) return;
  
        const video = document.querySelector("video");
        if (!video) return;
  
        video.currentTime = annotation.timestamp;
        toggleAnnotationPopup();
  
        const textarea = document.getElementById("annotation-text");
        if (textarea) {
          textarea.value = annotation.text;
        }
  
        const saveButton = document.getElementById("save-annotation");
        if (saveButton) {
          saveButton.onclick = () => {
            annotation.text = textarea.value;
            chrome.storage.local.set({ annotations: data.annotations }, () => {
              showNotification("Note updated successfully!");
              removeActivePopup();
              loadAnnotations();
            });
          };
        }
      });
    }
  
    function loadAnnotations() {
      const videoId = getVideoId();
      if (!videoId) return;
  
      chrome.storage.local.get({ annotations: {} }, (data) => {
        document.querySelectorAll(".annotation-marker").forEach(el => el.remove());
  
        const video = document.querySelector("video");
        const progressBar = document.querySelector(".ytp-progress-bar");
        if (!video || !progressBar) return;
  
        const videoAnnotations = data.annotations[videoId] || [];
  
        videoAnnotations.forEach(annotation => {
          const marker = document.createElement("div");
          marker.classList.add("annotation-marker");
          marker.style.left = `${(annotation.timestamp / video.duration) * 100}%`;
          marker.dataset.text = annotation.text;
          marker.dataset.time = formatTime(annotation.timestamp);
          marker.dataset.id = annotation.id;
  
          marker.addEventListener("mouseenter", (e) => showAnnotationPopup(e, marker));
          marker.addEventListener("mouseleave", hideAnnotationPopup);
          marker.addEventListener("click", (e) => {
            e.stopPropagation();
            video.currentTime = annotation.timestamp;
          });
  
          progressBar.appendChild(marker);
        });
      });
    }
  
    const observer = new MutationObserver(() => {
      createAnnotationButton();
      loadAnnotations();
    });
  
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(loadAnnotations, 1000);
      }
    }).observe(document, { subtree: true, childList: true });
  
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "jumpToTimestamp") {
        const video = document.querySelector("video");
        if (video) {
          video.currentTime = request.timestamp;
          video.play();
        }
      }
    });
  })();