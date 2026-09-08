const toast = document.querySelector('#toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

document.querySelector('#findStation').addEventListener('click', () => {
  document.querySelector('#mapQuery').value = document.querySelector('.search-box input').value;
  location.hash = '#map';
});

document.querySelector('#reserveButton').addEventListener('click', () => {
  showToast('Выберите АЗС для бронирования топлива');
});

document.querySelector('#queueButton').addEventListener('click', () => {
  showToast('Очередь доступна после выбора заправки');
});

document.querySelectorAll('.fuel-types button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('.fuel-types .selected')?.classList.remove('selected');
    button.classList.add('selected');
    showToast(`Выбрано топливо: ${button.textContent}`);
  });
});


const shell = document.querySelector('.app-shell');
const bookingScreen = document.querySelector('.booking-screen');
const notificationsScreen = document.querySelector('.notifications-screen');
const profileScreen = document.querySelector('.profile-screen');
const navLinks = [...document.querySelectorAll('.bottom-nav a')];

function renderRoute() {
  const route = ['#booking', '#notifications', '#profile', '#map'].includes(location.hash) ? location.hash.slice(1) : 'home';
  const bookingVisible = route === 'booking';
  shell.classList.toggle('show-booking', bookingVisible);
  bookingScreen.hidden = !bookingVisible;
  shell.classList.toggle('show-notifications', route === 'notifications');
  notificationsScreen.hidden = route !== 'notifications';
  shell.classList.toggle('show-profile', route === 'profile');
  profileScreen.hidden = route !== 'profile';
  shell.classList.toggle('show-map', route === 'map');
  document.querySelector('.map-screen').hidden = route !== 'map';
  if (route === 'map') requestAnimationFrame(initSamaraMap);
  navLinks.forEach(link => {
    const selected = link.hash === `#${route}`;
    link.classList.toggle('active', selected);
    if (selected) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
navLinks.forEach(link => {
  link.addEventListener('click', event => {
    if (!['#home', '#booking', '#notifications', '#profile', '#map'].includes(link.hash)) {
      event.preventDefault();
      showToast(`Раздел «${link.textContent}» пока в разработке`);
    }
  });
});
window.addEventListener('hashchange', renderRoute);
renderRoute();

const bookingTabs = [...document.querySelectorAll('.booking-tabs button')];
function selectBookingTab(selectedTab) {
  bookingTabs.forEach(tab => {
    const selected = tab === selectedTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  });
}
bookingTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectBookingTab(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? bookingTabs[0]
      : event.key === 'End' ? bookingTabs[bookingTabs.length - 1]
      : bookingTabs[(index + 1) % bookingTabs.length];
    selectBookingTab(next);
    next.focus();
  });
});



document.querySelector('#profileHistory').addEventListener('click', () => {
  selectBookingTab(document.querySelector('#history-tab'));
  location.hash = '#booking';
});
document.querySelector('#profileSettings').addEventListener('click', () => {
  showToast('Настройки профиля пока в разработке');
});
document.querySelector('#profileLogout').addEventListener('click', () => {
  showToast('Вы в демонстрационном профиле — вход в аккаунт ещё не подключён');
});

let samaraMap;
let stationLayer;
const mapOrigin = [53.2028, 50.1457];
const stockLabels = ['Нет топлива', 'Мало топлива', 'Топливо в наличии'];
const stockColors = ['#e84d4d', '#edb52e', '#2caa58'];
const fuelNames = ['АИ-98', 'АИ-100', 'АИ-92', 'АИ-95', 'ДТ'];
function stationState(station, fuel) {
  const seed = station.id % 1000;
  const fuelIndex = fuelNames.indexOf(fuel);
  return { stock: (seed + fuelIndex) % 3, price: [78.5, 85.9, 61.7, 67.5, 73.2][fuelIndex] + (seed % 8) * .3, wait: seed % 3 === 0 ? 0 : (seed % 5) * 3 };
}
function stationDistance(station) {
  return Math.hypot((station.lat - mapOrigin[0]) * 111.2, (station.lon - mapOrigin[1]) * 66.6);
}
function initSamaraMap() {
  if (!window.L) {
    document.querySelector('#mapResults').textContent = 'Карта не загрузилась. Проверьте интернет и обновите страницу.';
    return;
  }
  if (!samaraMap) {
    samaraMap = L.map('samaraMap').setView(mapOrigin, 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(samaraMap);
    stationLayer = L.layerGroup().addTo(samaraMap);
  }
  samaraMap.invalidateSize();
  updateStationMap();
}
function updateStationMap() {
  if (!samaraMap) return;
  const fuel = document.querySelector('[name="mapFuel"]:checked').value;
  const query = document.querySelector('#mapQuery').value.trim().toLocaleLowerCase('ru');
  const sort = document.querySelector('[name="mapSort"]:checked').value;
  const available = document.querySelector('#onlyAvailable').checked;
  const noQueue = document.querySelector('#onlyNoQueue').checked;
  const matches = samaraStations.map(station => ({ ...station, ...stationState(station, fuel), distance: stationDistance(station) }))
    .filter(station => (!available || station.stock > 0) && (!noQueue || station.wait === 0)
      && (!query || `${station.name} ${station.address}`.toLocaleLowerCase('ru').includes(query)))
    .sort((a, b) => a[sort] - b[sort] || a.distance - b.distance);
  stationLayer.clearLayers();
  const results = document.querySelector('#mapResults');
  results.replaceChildren();
  results.classList.toggle('has-query', Boolean(query));
  const summary = document.createElement('span');
  summary.textContent = matches.length ? `Найдено АЗС: ${matches.length}` : 'АЗС не найдены. Измените поиск или фильтры.';
  results.append(summary);
  matches.forEach(station => {
    const content = document.createElement('div');
    content.className = 'map-popup';
    const title = document.createElement('strong');
    title.textContent = station.name;
    content.append(title);
    for (const text of [station.address, `${fuel}: ${stockLabels[station.stock]}`, `${station.price.toFixed(2).replace('.', ',')} ₽/л · Очередь: ${station.wait} мин`, `От центра Самары: ${station.distance.toFixed(1)} км по прямой`].filter(Boolean)) {
      const p = document.createElement('p'); p.textContent = text; content.append(p);
    }
    const note = document.createElement('small');
    note.textContent = 'Наличие, цены и очередь — демонстрационные'; content.append(note);
    const marker = L.marker([station.lat, station.lon], {
      title: `${station.name}: ${stockLabels[station.stock]}`,
      icon: L.divIcon({ className: 'station-marker', html: `<span style="background:${stockColors[station.stock]}"><b>⛽</b></span>`, iconSize: [30, 38], iconAnchor: [15, 36], popupAnchor: [0, -34] })
    }).bindPopup(content).addTo(stationLayer);
    if (query) {
      const button = document.createElement('button'); button.type = 'button';
      button.textContent = `${station.name}${station.address ? ' · ' + station.address : ''} · ${stockLabels[station.stock]}`;
      button.addEventListener('click', () => { samaraMap.setView([station.lat, station.lon], 15); marker.openPopup(); results.classList.remove('has-query'); results.replaceChildren(summary); });
      results.append(button);
    }
  });
}
let addressMarker;
let addressRequest;
let lastAddressSearch = 0;
document.querySelector('.map-search').addEventListener('submit', async event => {
  event.preventDefault(); updateStationMap();
  if (!samaraMap) return;
  if (stationLayer.getLayers().length) {
    samaraMap.fitBounds(L.featureGroup(stationLayer.getLayers()).getBounds(), { padding: [35, 35], maxZoom: 15 });
    return;
  }
  const query = document.querySelector('#mapQuery').value.trim();
  if (!query || Date.now() - lastAddressSearch < 1100) return;
  lastAddressSearch = Date.now();
  addressRequest?.abort();
  addressRequest = new AbortController();
  const results = document.querySelector('#mapResults');
  results.textContent = 'Ищем адрес в Самаре…';
  const timeout = setTimeout(() => addressRequest.abort(), 10000);
  try {
    const params = new URLSearchParams({format:'jsonv2', q:`Самара, ${query}`, countrycodes:'ru', viewbox:'49.8,53.6,50.5,53.05', bounded:'1', limit:'1', 'accept-language':'ru'});
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {signal:addressRequest.signal});
    if (!response.ok) throw new Error('Address search unavailable');
    const places = await response.json();
    if (document.querySelector('#mapQuery').value.trim() !== query) return;
    if (!places.length) { results.textContent = 'Адрес не найден в Самаре. Уточните улицу и номер дома.'; return; }
    if (addressMarker) addressMarker.remove();
    const place = places[0];
    const label = document.createElement('span'); label.textContent = place.display_name;
    addressMarker = L.circleMarker([Number(place.lat), Number(place.lon)], {radius:9, color:'#1944ac', fillOpacity:.8}).addTo(samaraMap).bindPopup(label);
    document.querySelector('#mapQuery').value = '';
    updateStationMap();
    samaraMap.setView(addressMarker.getLatLng(), 15);
    addressMarker.openPopup();
  } catch (error) {
    if (document.querySelector('#mapQuery').value.trim() === query) results.textContent = 'Поиск адреса недоступен. Попробуйте ещё раз.';
  } finally { clearTimeout(timeout); }
});
document.querySelector('#mapQuery').addEventListener('input', updateStationMap);
document.querySelector('#mapFilters').addEventListener('change', updateStationMap);
document.querySelector('#toggleMapFilters').addEventListener('click', event => {
  const filters = document.querySelector('#mapFilters'); filters.hidden = !filters.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!filters.hidden));
});

// Station coordinates: OpenStreetMap contributors (ODbL), snapshot. Operational data above is demo.
const samaraStations = [{"lon":50.2248807,"name":"Олви","id":250971165,"address":"проспект Кирова 393А","lat":53.2514022},{"lon":50.2751080,"name":"Олви","id":293664199,"address":"","lat":53.2786552},{"lon":50.2654526,"name":"Олви","id":295238268,"address":"","lat":53.2758473},{"lon":50.1779582,"name":"Башнефть","id":530230447,"address":"Московское шоссе 15А","lat":53.2106927},{"lon":50.2962208,"name":"Башнефть","id":764149131,"address":"Олимпийская улица 28","lat":53.2568002},{"lon":50.2253412,"name":"Роснефть","id":892481867,"address":"","lat":53.2741651},{"lon":50.1697653,"name":"АЗС","id":1097371378,"address":"Уральская улица 239","lat":53.1275313},{"lon":50.1548289,"name":"АЗС","id":1097448622,"address":"","lat":53.1289052},{"lon":50.1390180,"name":"Irbis","id":1213953125,"address":"","lat":53.1927980},{"lon":50.2808982,"name":"Олви","id":1464993801,"address":"","lat":53.2263304},{"lon":50.2857891,"name":"Олви","id":1558221043,"address":"Ракитовское шоссе 90","lat":53.2646765},{"lon":50.2897142,"name":"Эко","id":1558433840,"address":"Ракитовское шоссе 4А к1","lat":53.2608267},{"lon":50.0853099,"name":"Лукойл","id":1917021718,"address":"","lat":53.1792202},{"lon":50.2675638,"name":"ТНК","id":3248983163,"address":"","lat":53.2492651},{"lon":50.2685536,"name":"АЗС","id":3248983165,"address":"","lat":53.2491575},{"lon":50.2803023,"name":"АЗС","id":4258467257,"address":"","lat":53.2058114},{"lon":50.2195636,"name":"Олви","id":4929303030,"address":"","lat":53.2568105},{"lon":50.1911816,"name":"Башнефть","id":4936492235,"address":"","lat":53.1819781},{"lon":50.1120802,"name":"Лукойл","id":4940223224,"address":"","lat":53.1345894},{"lon":50.0571498,"name":"ВДНХ","id":5081541184,"address":"","lat":53.1470013},{"lon":50.2844437,"name":"Метановая заправка Газпром","id":5359301921,"address":"проспект Карла Маркса 522","lat":53.2595003},{"lon":50.2577810,"name":"Лукойл","id":6685969885,"address":"","lat":53.2781111},{"lon":50.2875394,"name":"АЗС","id":6810707386,"address":"Ракитовское шоссе 1 с6","lat":53.2634238},{"lon":50.2834653,"name":"Полипроф","id":6813011788,"address":"Ракитовское шоссе 4В","lat":53.2629204},{"lon":50.1870352,"name":"АЗС","id":8491121827,"address":"","lat":53.2179067},{"lon":50.2695043,"name":"АЗС","id":8497122912,"address":"","lat":53.2473426},{"lon":50.2694991,"name":"Татнефть","id":8499440353,"address":"","lat":53.2473420},{"lon":50.1905962,"name":"Согаз","id":9774076945,"address":"","lat":53.2211971},{"lon":50.1956534,"name":"Татнефть","id":10083068908,"address":"","lat":53.2383588},{"lon":50.2180645,"name":"Татнефть","id":10083104221,"address":"","lat":53.1837522},{"lon":50.2174899,"name":"Татнефть","id":10083104222,"address":"","lat":53.2507002},{"lon":50.2927340,"name":"Татнефть","id":10083104223,"address":"","lat":53.2133350},{"lon":50.2426792,"name":"Татнефть","id":10083104293,"address":"","lat":53.2493250},{"lon":50.2054276,"name":"Teboil","id":10093836515,"address":"","lat":53.2483135},{"lon":50.2620862,"name":"Лукойл","id":10114498321,"address":"","lat":53.2554276},{"lon":50.2843680,"name":"Irbis","id":10654426906,"address":"","lat":53.2873117},{"lon":50.2119313,"name":"Роза мира","id":10799700416,"address":"","lat":53.2100062},{"lon":50.1903153,"name":"Бензоробот","id":10965749821,"address":"","lat":53.2207309},{"lon":50.2409224,"name":"Роза мира","id":10981661599,"address":"","lat":53.2606189},{"lon":50.2470081,"name":"Башнефть","id":10981661600,"address":"","lat":53.1973546},{"lon":50.0755523,"name":"Башнефть","id":10981661601,"address":"","lat":53.1624478},{"lon":50.2096918,"name":"Irbis","id":11190041326,"address":"проспект Кирова 435 к1","lat":53.2606978},{"lon":50.1808706,"name":"Роснефть","id":11210153699,"address":"","lat":53.1423761},{"lon":50.2380434,"name":"Полный бак","id":11868101370,"address":"","lat":53.2623135},{"lon":50.1746396,"name":"АЗС-робот","id":11964580635,"address":"","lat":53.1367323},{"lon":50.2443020,"name":"Эко-нефтепродукт","id":12069936316,"address":"","lat":53.2969708},{"lon":50.1940104,"name":"Роснефть","id":12215108684,"address":"","lat":53.1804847},{"lon":50.1927446,"name":"Олви","id":12215108690,"address":"","lat":53.1790928},{"lon":50.1155659,"name":"Роснефть","id":12216569808,"address":"","lat":53.1903180},{"lon":50.1421535,"name":"Газпромнефть","id":12703481011,"address":"улица Соколова 61А","lat":53.2139629},{"lon":50.1490526,"name":"Башнефть","id":12703481064,"address":"Дачная улица 10Б","lat":53.1949492},{"lon":50.1678012,"name":"АЗС","id":12813644060,"address":"Ракитная улица 6А","lat":53.1753739},{"lon":50.1868328,"name":"АЗС","id":12814246711,"address":"","lat":53.1782690},{"lon":50.1861085,"name":"АЗС","id":12814246713,"address":"","lat":53.1781194},{"lon":50.1490650,"name":"Олви","id":12814334913,"address":"","lat":53.2083648},{"lon":50.2020374,"name":"АЗС","id":12816189248,"address":"","lat":53.1774885},{"lon":50.2466417,"name":"Роснефть","id":12816189283,"address":"","lat":53.1957748},{"lon":50.2413740,"name":"АЗС","id":12816221918,"address":"","lat":53.1951555},{"lon":50.2064021,"name":"Роснефть","id":12839666005,"address":"Московское шоссе 232","lat":53.2411108},{"lon":50.1640609,"name":"Башнефть","id":12840762292,"address":"","lat":53.1935548},{"lon":50.2250862,"name":"Олви","id":12840772355,"address":"","lat":53.2156308},{"lon":50.1634045,"name":"АЗС","id":12840810948,"address":"","lat":53.1832918},{"lon":50.1892420,"name":"Бензомаркет","id":13144165227,"address":"","lat":53.2220333},{"lon":50.0291810,"name":"Irbis","id":13153709728,"address":"","lat":53.1452410},{"lon":50.1630255,"name":"Teboil","id":13266741253,"address":"","lat":53.2037057},{"lon":50.1716827,"name":"Роснефть","id":13266741257,"address":"","lat":53.2083548},{"lon":50.1655031,"name":"Башнефть","id":13266762460,"address":"","lat":53.2223921},{"lon":50.1677335,"name":"Shell","id":13266762461,"address":"Ново-Садовая улица 187А","lat":53.2222681},{"lon":50.1905684,"name":"Союзгаз","id":13484385859,"address":"","lat":53.2206432},{"lon":50.1913811,"name":"АЗС","id":14045335941,"address":"","lat":53.2206458}];

