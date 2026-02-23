// Configuration
let API_URL = 'http://localhost:3000';
let USER_ID = 'harjas';
let isTracking = true;

// Load config from storage
chrome.storage.local.get(['apiUrl', 'userId', 'isTracking'], (data) => {
  if (data.apiUrl) API_URL = data.apiUrl;
  if (data.userId) USER_ID = data.userId;
  if (data.isTracking !== undefined) isTracking = data.isTracking;
});

// Queue for offline support
let eventQueue = [];

async function sendEvent(eventType, metadata = {}) {
  if (!isTracking) return;

  const event = {
    userId: USER_ID,
    eventType,
    timestamp: Date.now(),
    ...metadata,
  };

  try {
    const response = await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    if (!response.ok) throw new Error('Failed to send');

    // Process queued events
    while (eventQueue.length > 0) {
      const queued = eventQueue.shift();
      try {
        await fetch(`${API_URL}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queued),
        });
      } catch {
        eventQueue.unshift(queued);
        break;
      }
    }

  } catch (error) {
    // Queue for later (offline support)
    eventQueue.push(event);
    chrome.storage.local.set({ eventQueue });
  }
}

// Track tab switches
let lastTabId = null;
let lastTabTime = Date.now();

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (lastTabId !== null && lastTabId !== activeInfo.tabId) {
    sendEvent('TAB_SWITCH');
  }

  lastTabId = activeInfo.tabId;
  lastTabTime = Date.now();
});

// Track idle time
let idleStartTime = null;

chrome.idle.setDetectionInterval(60); // 60 seconds

chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'idle' || state === 'locked') {
    idleStartTime = Date.now();
  } else if (state === 'active' && idleStartTime) {
    const idleDuration = Math.round((Date.now() - idleStartTime) / 60000); // minutes
    if (idleDuration > 0) {
      sendEvent('IDLE_TIME', { duration: idleDuration });
    }
    idleStartTime = null;
  }
});

// Track focus sessions (time spent on same tab)
setInterval(() => {
  if (lastTabId !== null) {
    const focusDuration = Math.round((Date.now() - lastTabTime) / 60000);
    if (focusDuration >= 5) { // Only log if 5+ minutes on same tab
      sendEvent('FOCUS_SESSION', { duration: focusDuration });
      lastTabTime = Date.now(); // Reset
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// Track new windows/tabs as APP_OPEN
chrome.tabs.onCreated.addListener(() => {
  sendEvent('APP_OPEN');
});

// Listen for config updates
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'UPDATE_CONFIG') {
    API_URL = msg.apiUrl || API_URL;
    USER_ID = msg.userId || USER_ID;
    isTracking = msg.isTracking !== undefined ? msg.isTracking : isTracking;
    chrome.storage.local.set({ apiUrl: API_URL, userId: USER_ID, isTracking });
    sendResponse({ status: 'ok' });
  }
  if (msg.type === 'GET_STATUS') {
    sendResponse({ 
      isTracking, 
      userId: USER_ID, 
      apiUrl: API_URL,
      queueSize: eventQueue.length 
    });
  }
});