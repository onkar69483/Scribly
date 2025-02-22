import React, { useEffect, useState } from "react";
import { Search, Clock, Trash2, ExternalLink, Info, LayoutDashboard, ChevronRight, Youtube, AlertCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Settings from "./components/Settings";

export default function App() {
  const [annotations, setAnnotations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [isYouTubeVideo, setIsYouTubeVideo] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = new URL(tabs[0].url);
      const isYoutube = url.hostname === 'www.youtube.com' && url.pathname === '/watch';
      setIsYouTubeVideo(isYoutube);

      if (isYoutube) {
        const videoId = url.searchParams.get("v");
        setCurrentVideoId(videoId);
        loadAnnotations(videoId);
      }
    });

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.annotations) {
        loadAnnotations(currentVideoId);
      }
    });
  }, [currentVideoId]);

  const loadAnnotations = (videoId) => {
    if (!videoId) return;

    chrome.storage.local.get("annotations", (data) => {
      if (data.annotations && data.annotations[videoId]) {
        const videoAnnotations = data.annotations[videoId].map((ann, index) => ({
          ...ann,
          id: ann.id || `note-${Date.now()}-${index}`,
        }));
        setAnnotations(videoAnnotations);
      } else {
        setAnnotations([]);
      }
    });
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  };

  const deleteAnnotation = (id) => {
    if (!currentVideoId) return;

    chrome.storage.local.get("annotations", (data) => {
      const updatedAnnotations = { ...data.annotations };
      if (updatedAnnotations[currentVideoId]) {
        updatedAnnotations[currentVideoId] = updatedAnnotations[currentVideoId].filter(
          (ann) => ann.id !== id
        );
        chrome.storage.local.set({ annotations: updatedAnnotations }, () => {
          setAnnotations(updatedAnnotations[currentVideoId] || []);
          setShowConfirmDelete(false);
        });
      }
    });
  };

  const filteredAndSortedAnnotations = annotations
    .filter((ann) => ann.text.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === "newest") return b.timestamp - a.timestamp;
      if (sortOrder === "oldest") return a.timestamp - b.timestamp;
      return 0;
    });

  if (!isYouTubeVideo) {
    return (
      <div className="min-h-screen w-[500px] min-w-[500px] max-w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full h-full flex flex-col items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="inline-block p-3 bg-red-100 dark:bg-red-900/20 rounded-full mb-4"
              >
                <AlertCircle className="w-8 h-8 text-red-500" />
              </motion.div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Not a YouTube Video
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                This extension only works on YouTube video pages
              </p>
            </div>

            {/* Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border dark:border-gray-700 p-6"
            >
              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">1</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Go to YouTube
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Visit youtube.com and find a video you want to take notes on
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">2</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Play the Video
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Start watching the video and use the note icon to add annotations
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    chrome.tabs.create({ url: 'https://youtu.be/b1F6seHhfDo?feature=shared' });
                  }}
                  className="w-full mt-6 inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Youtube className="w-4 h-4" />
                  <span className="font-medium">Open YouTube</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-[500px] min-w-[500px] max-w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b dark:border-gray-700 shadow-lg"
      >
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                YouTube Notes
              </h1>
              <span className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full text-sm font-medium">
                {annotations.length} {annotations.length === 1 ? "note" : "notes"}
              </span>
            </div>
            <motion.button
              onClick={() => {
                chrome.tabs.create({ url: 'dashboard.html' });
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <LayoutDashboard className="h-3 w-3" />
              <span className="text-xs font-medium">Dashboard</span>
              <ChevronRight className="h-3 w-3 transform group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSettingsOpen(true)}
              className="relative p-2.5 group"
            >
              <motion.div
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="relative w-5 h-5"
              >
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className="w-full h-full text-blue-500 dark:text-blue-400 transform transition-transform duration-300"
                >
                  <motion.path
                    d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.path
                    d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  />
                </svg>
                
                {/* Subtle glow effect on hover */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-blue-500/5 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300"
                  initial={false}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="w-full px-6 py-4">
        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col space-y-3 mb-4"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search your notes..."
              className="w-full pl-9 pr-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 outline-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </motion.div>

        {/* Notes Grid */}
        {annotations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center shadow-lg border dark:border-gray-700"
          >
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
              <Info className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Notes for This Video
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Click the note icon in the YouTube video player to start adding notes.
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div className="grid grid-cols-1 gap-3">
              {filteredAndSortedAnnotations.map((ann) => (
                <motion.div
                  key={ann.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="bg-blue-100 dark:bg-blue-900/50 p-1.5 rounded-md">
                        <Clock className="h-4 w-4 text-blue-500" />
                      </div>
                      <span className="text-sm font-medium text-blue-500">
                        {formatTime(ann.timestamp)}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            chrome.tabs.sendMessage(tabs[0].id, {
                              action: "jumpToTimestamp",
                              timestamp: ann.timestamp,
                            });
                          });
                        }}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors group"
                        title="Jump to timestamp"
                      >
                        <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-blue-500 transition-colors" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAnnotation(ann);
                          setShowConfirmDelete(true);
                        }}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors group"
                        title="Delete note">
                        <Trash2 className="h-4 w-4 text-gray-500 group-hover:text-red-500 transition-colors" />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {ann.text}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Delete Note?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
                Are you sure you want to delete this note? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteAnnotation(selectedAnnotation.id)}
                  className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}