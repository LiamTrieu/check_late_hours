(function () {
  const XHR = XMLHttpRequest.prototype;
  const open = XHR.open;
  const send = XHR.send;
  const setRequestHeader = XHR.setRequestHeader;

  XHR.open = function (method, url) {
    this._method = method;
    this._url = url;
    this._requestHeaders = {};
    this._startTime = new Date().toISOString();
    return open.apply(this, arguments);
  };

  XHR.setRequestHeader = function (header, value) {
    this._requestHeaders[header] = value;
    return setRequestHeader.apply(this, arguments);
  };

  XHR.send = function () {
    this.addEventListener('load', function () {
      if (!this._url) return;

      const url = this._url.toLowerCase();
      if (url.includes('timesheet/me') && this.responseText) {
        try {
          const response = JSON.parse(this.responseText);
          window.postMessage(
            {
              type: 'RESPONSE TIMESHEET',
              data: response,
            },
            '*'
          );
        } catch (err) {
          console.error('Error parsing response:', err);
        }
      }
    });

    return send.apply(this, arguments);
  };
})(XMLHttpRequest);
