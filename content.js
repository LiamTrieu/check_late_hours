(function injectScript() {
  let script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
})();

// Lắng nghe dữ liệu từ injected.js
window.addEventListener('message', function (event) {
  if (
    event.source !== window ||
    !event.data ||
    event.data.type !== 'RESPONSE TIMESHEET'
  )
    return;
  const data = event.data.data ? event.data.data.items : [];
  const dataFilter = data.filter((item) => item.adjustedWorkingMinutes > 0);
  console.log(dataFilter);

  const result = dataFilter.reduce((result, item) => {
    const timeToMinutes = (time) => {
      const [h, m, s] = time.split(':').map(Number);
      return h * 60 + m;
    };

    let lateMinutes = 0;

    if (!item.adjusted) {
      const checkinMinutes = timeToMinutes(item.checkinTime);
      const checkoutMinutes = timeToMinutes(item.checkoutTime);

      if (checkinMinutes > 9 * 60) {
        lateMinutes += checkinMinutes - 9 * 60;
      }
      if (checkoutMinutes < 17 * 60 + 30) {
        lateMinutes += 17 * 60 + 30 - checkoutMinutes;
      }
    }

    let missingMinutes = Math.max(0, item.expectedWorkingMinutes - item.adjustedWorkingMinutes);

    return result + Math.max(lateMinutes, missingMinutes);
  }, 0);

  insertInfoLate(result);
});

function insertInfoLate(value) {
  const divElement = document.getElementById('function-buttons');
  if (!divElement) return;

  let infoLateElement = document.getElementById('info-late');

  if (infoLateElement) {
    infoLateElement.textContent = `${value} | 180`;
  } else {
    const infoLateHTML = `<h4 id="info-late" title="Số phút còn lại: ${(180 - value) ? (180 - value) : 0} phút" class="text-white font-weight-bolder" style="margin-bottom: 0;">${value} | 180</h4>`;
    divElement.insertAdjacentHTML('afterbegin', infoLateHTML);
  }
}
