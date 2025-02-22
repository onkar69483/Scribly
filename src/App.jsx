import React, { useEffect, useState } from "react";
import { Search, Clock, Trash2, ExternalLink, Info, LayoutDashboard, ChevronRight  } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function App() {
  const [annotations, setAnnotations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [currentVideoId, setCurrentVideoId] = useState(null);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = new URL(tabs[0].url);
      const videoId = url.searchParams.get("v");
      setCurrentVideoId(videoId);
      loadAnnotations(videoId);
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
          setAnnotations(updatedAnnotations[currentVideoId]);
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
                          title="Delete note"
                        >
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
      </div>
    );
  }