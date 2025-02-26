let apiData = [];
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
  apiData = event.data.data ? event.data.data.items : [];

  checkTimeLate(apiData);
});

function checkTimeLate(data) {
  let blackList = getBlackListFromStorage();
  const dataFilter = data.filter(
    (item) =>
      item.adjustedWorkingMinutes > 0 && !blackList.includes(item.checkinDate)
  );

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

    let missingMinutes = Math.max(
      0,
      item.expectedWorkingMinutes - item.adjustedWorkingMinutes
    );

    return result + Math.max(lateMinutes, missingMinutes);
  }, 0);

  insertInfoLate(result);
}

function insertInfoLate(value) {
  const divElement = document.getElementById("function-buttons");
  if (!divElement) return;

  let infoLateElement = document.getElementById("info-late");

  const remainingMinutes = value ? 180 - value : 0;
  const blackList = getBlackListFromStorage();

  const formattedBlackList = blackList
    .map((date) => {
      const [year, month, day] = date.split("-");
      return `${day}-${month}-${year}`;
    })
    .join("\n");

  const blackListText =
    blackList.length > 0 ? `\nNgày không kiểm tra:\n${formattedBlackList}` : "";

  const newTitle = `Số phút còn lại: ${remainingMinutes} phút${blackListText}`;
  const newTextContent = `${value} | 180`;

  if (infoLateElement) {
    infoLateElement.textContent = newTextContent;
    infoLateElement.title = newTitle;
  } else {
    const infoLateHTML = `
        <h4 id="info-late" 
            title="${newTitle}" 
            class="text-white font-weight-bolder" 
            style="margin-bottom: 0;">
            ${newTextContent}
        </h4>`;

    divElement.insertAdjacentHTML("afterbegin", infoLateHTML);
  }
}


document.addEventListener(
  'click',
  (event) => {
    const valueDay = getDayClickd(event);
    if (valueDay) {
      setTimeout(() => {
        updateButton(formatDate(valueDay));
      }, 200);
    }
  },
  true
);

function formatDate(valueDay) {
  const monthAndYear = getMonthAndYear();
  const year = monthAndYear[2];
  let month = monthAndYear[1];
  let day = valueDay;

  month = month.padStart(2, '0');
  day = day.toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function updateButton(valueDay) {
  const elementDetail = document.getElementsByClassName('cal-open-day-events');

  if (elementDetail?.[0]) {
    const buttonId = 'button-exention-check';
    const buttonExentionCheck = document.getElementById(buttonId);
    buttonExentionCheck?.remove();

    let blackListCheckLate = getBlackListFromStorage();
    const isBlacklisted = blackListCheckLate.includes(valueDay);
    const buttonText = isBlacklisted ? 'Kiểm tra' : 'Không kiểm tra';

    elementDetail[0].insertAdjacentHTML(
      'afterbegin',
      `<button id="${buttonId}" type="button" class="btn btn-primary btn-14" style="float: right;">${buttonText}</button>`
    );

    document.getElementById(buttonId).addEventListener('click', () => {
      let updatedBlackList = getBlackListFromStorage();

      if (updatedBlackList.includes(valueDay)) {
        updatedBlackList = updatedBlackList.filter((day) => day !== valueDay);
      } else {
        updatedBlackList.push(valueDay);
      }

      updateBlackListInStorage(updatedBlackList);
      updateButton(valueDay);
      checkTimeLate(apiData);
    });
  }
}

function getBlackListFromStorage() {
  return JSON.parse(localStorage.getItem('blackListCheckLate')) || [];
}

function updateBlackListInStorage(blackList) {
  localStorage.setItem('blackListCheckLate', JSON.stringify(blackList));
}

function getMonthAndYear() {
  const headerElement = document.getElementsByClassName('header-row')[0];

  if (headerElement) {
    const h3Element = headerElement.querySelector('h3.mb-0.mr-10');

    if (h3Element) {
      return h3Element.textContent.trim().split(' ');
    }
  }
  return null;
}

function getDayClickd(event) {
  if (event.target.classList.contains('cal-day-number')) {
    return event.target.textContent.trim();
  } else {
    const spanElement = event.target.querySelector('.cal-day-number');
    if (spanElement) {
      return spanElement.textContent.trim();
    }
  }
}
