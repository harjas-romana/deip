const statusDot = document.getElementById('statusDot');
const toggleBtn = document.getElementById('toggleBtn');
const userIdInput = document.getElementById('userId');
const apiUrlInput = document.getElementById('apiUrl');
const statusText = document.getElementById('status');

// Load current status
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
  if (response) {
    userIdInput.value = response.userId || '';
    apiUrlInput.value = response.apiUrl || '';
    updateUI(response.isTracking, response.queueSize);
  }
});

function updateUI(isTracking, queueSize = 0) {
  statusDot.className = `dot ${isTracking ? 'active' : 'inactive'}`;
  toggleBtn.textContent = isTracking ? 'STOP TRACKING' : 'START TRACKING';
  toggleBtn.className = `btn ${isTracking ? 'btn-danger' : 'btn-primary'}`;
  statusText.textContent = isTracking 
    ? `TRACKING ACTIVE • ${queueSize} queued` 
    : 'TRACKING PAUSED';
}

toggleBtn.addEventListener('click', () => {
  const isCurrentlyTracking = statusDot.classList.contains('active');
  
  chrome.runtime.sendMessage({
    type: 'UPDATE_CONFIG',
    userId: userIdInput.value,
    apiUrl: apiUrlInput.value,
    isTracking: !isCurrentlyTracking,
  }, () => {
    updateUI(!isCurrentlyTracking);
  });
});