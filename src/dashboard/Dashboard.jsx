import React, { useState, useEffect } from 'react';
import { Search, Clock, Play, Trash2, BookOpen, Calendar, ChevronRight, ArrowUpRight, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Dashboard = () => {
  const [allAnnotations, setAllAnnotations] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [videoDetails, setVideoDetails] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllAnnotations();
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.annotations) {
        loadAllAnnotations();
      }
    });
  }, []);

  const loadAllAnnotations = () => {
    chrome.storage.local.get("annotations", (data) => {
      if (data.annotations) {
        setAllAnnotations(data.annotations);
        // Fetch video details for each video ID
        Object.keys(data.annotations).forEach(fetchVideoDetails);
      }
      setLoading(false);
    });
  };

  const fetchVideoDetails = async (videoId) => {
    // In a real implementation, you'd want to batch these requests
    // or use YouTube's API. For now, we'll just store the ID
    setVideoDetails(prev => ({
      ...prev,
      [videoId]: {
        id: videoId,
        title: `Video ${videoId}`,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
      }
    }));
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

  const getStats = () => {
    const totalNotes = Object.values(allAnnotations).reduce((sum, notes) => sum + notes.length, 0);
    const totalVideos = Object.keys(allAnnotations).length;
    
    // Calculate total duration from all notes
    const totalSeconds = Object.values(allAnnotations).reduce((sum, notes) => {
      return sum + notes.reduce((videoSum, note) => videoSum + note.timestamp, 0);
    }, 0);
    const totalHours = Math.floor(totalSeconds / 3600);

    return [
      { label: "Total Notes", value: totalNotes, icon: BookOpen },
      { label: "Videos Annotated", value: totalVideos, icon: Play },
      { label: "Hours of Content", value: totalHours, icon: Clock },
      { label: "Days Active", value: "N/A", icon: Calendar }
    ];
  };

  const sortedVideos = Object.entries(allAnnotations)
    .map(([videoId, notes]) => ({
      videoId,
      notes,
      lastActive: Math.max(...notes.map(note => note.timestamp)),
      ...videoDetails[videoId]
    }))
    .sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return b.lastActive - a.lastActive;
        case "notes":
          return b.notes.length - a.notes.length;
        default:
          return 0;
      }
    })
    .filter(video => 
      video.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.notes.some(note => note.text.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="border-b dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notes Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage all your YouTube video notes
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search videos & notes..."
                  className="w-full pl-9 pr-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 outline-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <option value="recent">Most Recent</option>
                <option value="notes">Most Notes</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {getStats().map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
                  <stat.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stat.value}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Videos Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading your notes...</p>
          </div>
        ) : sortedVideos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No videos found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedVideos.map((video) => (
              <motion.div
                key={video.videoId}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="group bg-white dark:bg-gray-800 rounded-lg overflow-hidden border dark:border-gray-700 hover:shadow-lg transition-all duration-200"
              >
                <div className="relative">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => {
                        chrome.tabs.create({
                          url: `https://youtube.com/watch?v=${video.videoId}`
                        });
                      }}
                      className="bg-white/90 hover:bg-white text-gray-900 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all transform scale-95 hover:scale-100"
                    >
                      <Play className="h-4 w-4" />
                      Open Video
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2">
                    {video.title}
                  </h3>
                  <div className="space-y-2">
                    {video.notes.map((note) => (
                      <div key={note.id} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-500 dark:text-blue-400 whitespace-nowrap">
                          {formatTime(note.timestamp)}
                        </span>
                        <p className="text-gray-600 dark:text-gray-300 line-clamp-1">
                          {note.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;