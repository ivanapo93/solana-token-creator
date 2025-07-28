// token-creation-logger.js

(function () {
  // Error banner and console logger helper
  const errorBanner = document.getElementById('error-banner');
  const statusEl = document.getElementById('status');

  window.logError = function (message) {
    console.error(message);
    if (errorBanner) {
      errorBanner.style.display = 'block';
      errorBanner.textContent = message;
    }
    if (statusEl) statusEl.textContent = '';
  };

  window.clearError = function () {
    if (errorBanner) {
      errorBanner.style.display = 'none';
      errorBanner.textContent = '';
    }
  };

  window.logStatus = function (message) {
    console.log(message);
    if (statusEl) {
      statusEl.textContent = message;
    }
    if (errorBanner) {
      errorBanner.style.display = 'none';
      errorBanner.textContent = '';
    }
  };

  // Global handler for unhandledrejection (promise errors)
  window.addEventListener('unhandledrejection', event => {
    logError('Unhandled promise rejection: ' + event.reason);
  });

  // Global error handler
  window.addEventListener('error', event => {
    logError('Error: ' + event.message + ' at ' + event.filename + ':' + event.lineno);
  });
})();