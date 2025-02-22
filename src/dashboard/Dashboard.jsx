
/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Search, Clock, Play, Trash2, BookOpen, Calendar, Download, Upload, FileText, X, Filter, ChevronDown, Check } from 'lucide-react';

// Modal Component with improved styling
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/70 transition-opacity" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-900 rounded-xl max-w-3xl w-full p-6 shadow-2xl transform transition-all">
          {children}
        </div>
      </div>
    </div>
  );
};

// Enhanced Dropdown Component
const Dropdown = ({ value, onChange, options, label }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
        {label}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        <span>{options.find(opt => opt.value === value)?.label || 'Select...'}</span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
          {options.map((option) => (
            <button
              key={option.value}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const [allAnnotations, setAllAnnotations] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [videoDetails, setVideoDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [dateFilter, setDateFilter] = useState("all");
  const [lengthFilter, setLengthFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editText, setEditText] = useState("");

  const onDeleteNote = (noteId) => {
    if (!selectedVideo) return;
    const updatedNotes = selectedVideo.notes.filter((note) => note.id !== noteId);
    setAllAnnotations((prevAnnotations) => {
      const updatedAnnotations = { ...prevAnnotations };
      if (updatedNotes.length === 0) {
        delete updatedAnnotations[selectedVideo.videoId];
      } else {
        updatedAnnotations[selectedVideo.videoId] = updatedNotes;
      }
      chrome.storage.local.set({ annotations: updatedAnnotations }, () => {
        console.log("Note deleted successfully!");
      });
      return updatedAnnotations;
    });
    setSelectedVideo(updatedNotes.length === 0 ? null : { ...selectedVideo, notes: updatedNotes });
  };
  const onDeleteAllNotes = () => {
    if (!selectedVideo) return;
    // Remove all notes for the selected video
    const updatedAnnotations = { ...allAnnotations };
    // console.log("Update Annotations", updatedAnnotations);
    delete updatedAnnotations[selectedVideo.videoId];
    // Update the state
    setAllAnnotations(updatedAnnotations);
    // Update chrome.storage.local
    chrome.storage.local.set({ annotations: updatedAnnotations }, () => {
      console.log("All notes deleted successfully!");
      setSelectedVideo(null); // Close the modal after deletion
    });
  };

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
        Object.keys(data.annotations).forEach(fetchVideoDetails);
      }
      setLoading(false);
    });
  };

  const fetchVideoDetails = async (videoId) => {
    try {
      const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      const data = await response.json();
      setVideoDetails(prev => ({
        ...prev,
        [videoId]: {
          id: videoId,
          title: data.title || `Video ${videoId}`,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          author: data.author_name || 'Unknown Creator'
        }
      }));
    } catch (error) {
      console.error('Error fetching video details:', error);
      setVideoDetails(prev => ({
        ...prev,
        [videoId]: {
          id: videoId,
          title: `Video ${videoId}`,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          author: 'Unknown Creator'
        }
      }));
    }
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

  const exportToPDF = async (videoId) => {
    const video = sortedVideos.find(v => v.videoId === videoId);
    const content = `
      # Notes for ${video.title}
      
      ${video.notes.map(note => `${formatTime(note.timestamp)} - ${note.text}`).join('\n\n')}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-${videoId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAllNotes = () => {
    const exportData = JSON.stringify(allAnnotations);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'youtube-notes-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importNotes = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          chrome.storage.local.set({ annotations: importedData }, () => {
            loadAllAnnotations();
          });
        } catch (error) {
          console.error('Error importing notes:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const onEditNote = (noteId) => {
    if (!selectedVideo) return;

    // Find the note to edit
    const noteToEdit = selectedVideo.notes.find((note) => note.id === noteId);

    if (noteToEdit) {
      setEditingNoteId(noteId);
      setEditText(noteToEdit.text);
    }
  };

  const saveEditedNote = () => {
    if (!selectedVideo || editingNoteId === null) return;

    const updatedNotes = selectedVideo.notes.map((note) =>
      note.id === editingNoteId ? { ...note, text: editText } : note
    );

    setAllAnnotations((prevAnnotations) => {
      const updatedAnnotations = { ...prevAnnotations };
      updatedAnnotations[selectedVideo.videoId] = updatedNotes;

      chrome.storage.local.set({ annotations: updatedAnnotations }, () => {
        console.log("Note edited successfully!");
      });

      return updatedAnnotations;
    });

    setSelectedVideo({ ...selectedVideo, notes: updatedNotes });
    setEditingNoteId(null);
    setEditText("");
  };

  const handleInputChange = (e) => {
    setEditText(e.target.value);
  };

  const handleSaveEdit = () => {
    saveEditedNote();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      saveEditedNote();
    }
  };

  const handleEditClick = (note) => {
    onEditNote(note.id);
  };

  const handleSaveClick = () => {
    saveEditedNote();
  };

  const getStats = () => {
    const totalNotes = Object.values(allAnnotations).reduce((sum, notes) => sum + notes.length, 0);
    const totalVideos = Object.keys(allAnnotations).length;
    const totalSeconds = Object.values(allAnnotations).reduce((sum, notes) => {
      return sum + notes.reduce((videoSum, note) => videoSum + note.timestamp, 0);
    }, 0);
    const totalHours = Math.floor(totalSeconds / 3600);

    return [
      { label: "Total Notes", value: totalNotes, icon: BookOpen, color: "from-blue-500 to-blue-600" },
      { label: "Videos Annotated", value: totalVideos, icon: Play, color: "from-emerald-500 to-emerald-600" },
      { label: "Hours of Content", value: totalHours, icon: Clock, color: "from-purple-500 to-purple-600" },
      { label: "Days Active", value: "N/A", icon: Calendar, color: "from-pink-500 to-pink-600" }
    ];
  };

  const filterVideos = (videos) => {
    let filtered = videos;

    if (dateFilter !== "all") {
      const now = Date.now();
      const timeFrames = {
        "today": 24 * 60 * 60 * 1000,
        "week": 7 * 24 * 60 * 60 * 1000,
        "month": 30 * 24 * 60 * 60 * 1000
      };
      filtered = filtered.filter(video =>
        (now - video.lastActive) <= timeFrames[dateFilter]
      );
    }

    if (lengthFilter !== "all") {
      const lengthRanges = {
        "few": [1, 5],
        "medium": [6, 15],
        "many": [16, Infinity]
      };
      filtered = filtered.filter(video =>
        video.notes.length >= lengthRanges[lengthFilter][0] &&
        video.notes.length <= lengthRanges[lengthFilter][1]
      );
    }

    return filtered;
  };

  const sortedVideos = filterVideos(
    Object.entries(allAnnotations)
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
          case "title":
            return a.title?.localeCompare(b.title);
          default:
            return 0;
        }
      })
      .filter(video =>
        video.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.notes.some(note => note.text.toLowerCase().includes(searchTerm.toLowerCase()))
      )
  );

  const NotesModal = ({ video, onClose, onDeleteNote, onDeleteAllNotes }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className='max-w-[400]'>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{video.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{video.author}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportToPDF(video.videoId)}
            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <FileText className="h-4 w-4 mr-2" />
            Export Notes
          </button>
          <button
            onClick={() => {
              chrome.tabs.create({
                url: `https://youtube.com/watch?v=${video.videoId}`
              });
            }}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg"
          >
            <Play className="h-4 w-4 mr-2" />
            Open Video
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <button
        onClick={() => onDeleteAllNotes()}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg z-50 cursor-pointer"
      >
        <Trash2 className="h-4 w-4 mr-2" /> Delete All Notes
      </button>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {video.notes.map((note) => (
          <div
            key={note.id}
            className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="px-2 py-1 text-sm font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded">
              {formatTime(note.timestamp)}
            </span>

            {editingNoteId === note.id ? (
              <input
                type="text"
                value={editText}
                onChange={handleInputChange}
                onBlur={handleSaveEdit}
                onKeyDown={handleKeyDown}
                autoFocus
                className="flex-1 px-2 py-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none text-gray-700 dark:text-gray-300"
              />
            ) : (
              <p className="text-gray-700 dark:text-gray-300 flex-1">{note.text}</p>
            )}

            <div className="flex items-center gap-2">
              {editingNoteId === note.id ? (
                <button
                  onClick={handleSaveClick}
                  className="relative group p-1"
                >
                  <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-gray-300/30 dark:bg-gray-700/50 rounded-full"></div>
                  <Check color="#2ad813" className="h-4 w-4 text-white dark:text-gray-300 relative" />
                </button>
              ) : (
                <button className="relative group p-1" onClick={() => handleEditClick(note)}>
                  <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-gray-300/30 dark:bg-gray-700/50 rounded-full"></div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-white dark:text-gray-300 relative"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
              )}

              <button
                onClick={() => onDeleteNote(note.id)}
                className="hover:bg-red-50 dark:hover:bg-red-900/50 rounded-full text-red-500 dark:text-red-400 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );


  const FilterPanel = () => (
    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4 z-20 text-white">
      <Dropdown
        label="Time Period"
        value={dateFilter}
        onChange={setDateFilter}
        options={[
          { value: "all", label: "All Time" },
          { value: "today", label: "Today" },
          { value: "week", label: "This Week" },
          { value: "month", label: "This Month" }
        ]}
      />

      <Dropdown
        label="Notes Count"
        value={lengthFilter}
        onChange={setLengthFilter}
        options={[
          { value: "all", label: "All" },
          { value: "few", label: "Few (1-5)" },
          { value: "medium", label: "Medium (6-15)" },
          { value: "many", label: "Many (15+)" }
        ]}
      />

      <Dropdown
        label="Sort By"
        value={sortBy}
        onChange={setSortBy}
        options={[
          { value: "recent", label: "Most Recent" },
          { value: "notes", label: "Most Notes" },
          { value: "title", label: "Title" }
        ]}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Enhanced Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                Notes Dashboard
              </h1>
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
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {/* Filters */}
              <div className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 gap-2 transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
                {showFilters && <FilterPanel />}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={exportAllNotes}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-200 transition-colors"
                  title="Export All Notes"
                >
                  <Download className="h-4 w-4" />
                </button>
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={importNotes}
                    className="hidden"
                    id="import-notes"
                  />
                  <button
                    onClick={() => document.getElementById('import-notes').click()}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-200 transition-colors"
                    title="Import Notes"
                  >
                    <Upload className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {getStats().map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`bg-gradient-to-r ${stat.color} p-3 rounded-lg text-white`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stat.value}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Enhanced Videos Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading your notes...</p>
          </div>
        ) : sortedVideos.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-md mx-auto border border-gray-200 dark:border-gray-700">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 dark:text-gray-200 text-lg font-medium mb-2">No videos found</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Try adjusting your search or filters
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedVideos.map((video) => (
              <div
                key={video.videoId}
                onClick={() => setSelectedVideo(video)}
                className="group bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:-translate-y-1"
              >
                <div className="relative">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
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
                  <div className="absolute top-2 right-2 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium">
                    {video.notes.length} notes
                  </div>
                </div>
                <div className="p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                      {video.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {video.author}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {video.notes.slice(0, 2).map((note) => (
                      <div key={note.id} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-500 dark:text-blue-400 whitespace-nowrap font-medium">
                          {formatTime(note.timestamp)}
                        </span>
                        <p className="text-gray-600 dark:text-gray-300 line-clamp-1">
                          {note.text}
                        </p>
                      </div>
                    ))}
                    {video.notes.length > 2 && (
                      <p className="text-sm text-blue-500 dark:text-blue-400 mt-2 flex items-center font-medium">
                        <ChevronDown className="h-4 w-4 mr-1" />
                        {video.notes.length - 2} more notes
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes Modal */}
      <Modal isOpen={selectedVideo !== null} onClose={() => setSelectedVideo(null)}>
        {selectedVideo && (
          <NotesModal
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
            onDeleteNote={onDeleteNote}
            onDeleteAllNotes={onDeleteAllNotes}
          />
        )}
      </Modal>
    </div>
  );
};

export default Dashboard;