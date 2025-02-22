import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, X, RefreshCw, Moon, Sun, Palette, Trash2, Database, Shield, HelpCircle } from 'lucide-react';

export const Settings = ({ isOpen, onClose }) => {
  const [isDangerZoneOpen, setIsDangerZoneOpen] = React.useState(false);
  const [showConfirmReset, setShowConfirmReset] = React.useState(false);
  const [theme, setTheme] = React.useState('system');

  const handleReset = () => {
    chrome.storage.local.clear(() => {
      setShowConfirmReset(false);
      onClose();
      // You might want to trigger a reload of the popup
      window.location.reload();
    });
  };

  const menuItems = [
    {
      icon: <Palette className="w-5 h-5" />,
      title: "Appearance",
      description: "Customize how YouTube Notes looks",
      onClick: () => {},
      badge: "Soon"
    },
    {
      icon: <Database className="w-5 h-5" />,
      title: "Data Management",
      description: "Export and import your notes",
      onClick: () => {},
      badge: "Soon"
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Privacy",
      description: "Manage your privacy settings",
      onClick: () => {},
      badge: "Soon"
    },
    {
      icon: <HelpCircle className="w-5 h-5" />,
      title: "Help & Support",
      description: "Get help using YouTube Notes",
      onClick: () => {},
      badge: "Soon"
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative border-b dark:border-gray-700">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl">
                    <SettingsIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
                </div>
                <motion.button
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.2 }}
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {/* Theme Selection */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Theme</h3>
                <div className="grid grid-cols-3 gap-2">
                  {['light', 'dark', 'system'].map((themeOption) => (
                    <motion.button
                      key={themeOption}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setTheme(themeOption)}
                      className={`p-3 rounded-xl border ${
                        theme === themeOption
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      } transition-all duration-200`}
                    >
                      <div className="flex flex-col items-center space-y-1">
                        {themeOption === 'light' ? (
                          <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        ) : themeOption === 'dark' ? (
                          <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        ) : (
                          <div className="w-5 h-5 flex">
                            <Sun className="w-3 h-5 text-gray-700 dark:text-gray-300" />
                            <Moon className="w-3 h-5 text-gray-700 dark:text-gray-300" />
                          </div>
                        )}
                        <span className="text-xs font-medium capitalize text-gray-700 dark:text-gray-300">
                          {themeOption}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Menu Items */}
              <div className="space-y-2">
                {menuItems.map((item, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={item.onClick}
                    className="w-full p-3 flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-gray-500 dark:text-gray-400">{item.icon}</div>
                      <div className="text-left">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Danger Zone */}
              <motion.div
                initial={false}
                animate={{ height: isDangerZoneOpen ? 'auto' : '48px' }}
                className="mt-6 border border-red-200 dark:border-red-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setIsDangerZoneOpen(!isDangerZoneOpen)}
                  className="w-full p-3 flex items-center justify-between bg-red-50 dark:bg-red-900/20"
                >
                  <div className="flex items-center space-x-2">
                    <Trash2 className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      Danger Zone
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: isDangerZoneOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <RefreshCw className="w-4 h-4 text-red-500" />
                  </motion.div>
                </button>
                {isDangerZoneOpen && (
                  <div className="p-3 bg-white dark:bg-gray-800">
                    <button
                      onClick={() => setShowConfirmReset(true)}
                      className="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      Reset Extension
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>

          {/* Reset Confirmation Modal */}
          <AnimatePresence>
            {showConfirmReset && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <Trash2 className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Reset Extension
                    </h3>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    This will permanently delete all your notes and settings. This action cannot be
                    undone.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowConfirmReset(false)}
                      className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleReset}
                      className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                      Reset Everything
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Settings;