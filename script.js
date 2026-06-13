// ==================== 天气查询应用 ====================
var API_KEY = '28ccd1d496d6f120a926e0c531cb4226';
var GEO_URL  = 'https://api.openweathermap.org/geo/1.0/direct';
var WTH_URL  = 'https://api.openweathermap.org/data/2.5/weather';
var FCT_URL  = 'https://api.openweathermap.org/data/2.5/forecast';
var AQI_URL  = 'https://api.openweathermap.org/data/2.5/air_pollution';
var ICON_URL = 'https://openweathermap.org/img/wn/';

// ==================== DOM引用 ====================
var $ = function(id) { return document.getElementById(id); };

var elInput       = $('cityInput');
var elSuggestions = $('suggestions');
var elLocateBtn   = $('locateBtn');
var elMsgToast    = $('msgToast');
var elMsgIcon     = $('msgIcon');
var elMsgText     = $('msgText');
var elContent     = $('content');
var elFxLayer     = $('fxLayer');
var elHistoryWrap = $('historyWrap');
var elHistoryTags = $('historyTags');
var elClearHist   = $('clearHistory');

// ==================== 工具函数 ====================
function pad(n) { return n < 10 ? '0' + n : '' + n; }

function fmtTime(ts) {
    var d = new Date(ts * 1000);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function fmtHour(ts) {
    return pad(new Date(ts * 1000).getHours()) + ':00';
}

function fmtDateCN(ts) {
    var d = new Date(ts * 1000);
    var w = ['周日','周一','周二','周三','周四','周五','周六'];
    return w[d.getDay()];
}

function getWindDir(deg) {
    var dirs = ['北','东北','东','东南','南','西南','西','西北'];
    var i = Math.round(deg / 45) % 8;
    return dirs[i];
}

function getTheme(weatherId) {
    if (weatherId >= 200 && weatherId < 300) return 'thunderstorm';
    if (weatherId >= 300 && weatherId < 400) return 'drizzle';
    if (weatherId >= 500 && weatherId < 600) return 'rain';
    if (weatherId >= 600 && weatherId < 700) return 'snow';
    if (weatherId >= 700 && weatherId < 800) return 'mist';
    if (weatherId === 800) return 'sunny';
    if (weatherId === 801) return 'clouds-few';
    return 'clouds';
}

// ==================== Toast消息 ====================
function showLoading(msg) {
    elMsgToast.className = 'msg-toast loading show';
    elMsgIcon.innerHTML = '<span class="spin"></span>';
    elMsgText.textContent = msg || '查询中...';
}

function showError(msg) {
    elMsgToast.className = 'msg-toast error show';
    elMsgIcon.textContent = '!';
    elMsgText.textContent = msg;
}

function hideToast() {
    elMsgToast.className = 'msg-toast';
}

// ==================== 天气特效 ====================
function clearEffects() {
    elFxLayer.innerHTML = '';
    var old = document.querySelector('.sun-glow');
    if (old) old.remove();
}

function createRaindrops(count) {
    for (var i = 0; i < count; i++) {
        var drop = document.createElement('div');
        drop.className = 'raindrop';
        drop.style.left = Math.random() * 100 + '%';
        drop.style.height = (6 + Math.random() * 10) + 'px';
        drop.style.animationDuration = (0.4 + Math.random() * 0.6) + 's';
        drop.style.animationDelay = Math.random() * 3 + 's';
        elFxLayer.appendChild(drop);
    }
}

function createSnowflakes(count) {
    for (var i = 0; i < count; i++) {
        var flake = document.createElement('div');
        flake.className = 'snowflake';
        flake.style.left = Math.random() * 100 + '%';
        flake.style.width = flake.style.height = (3 + Math.random() * 5) + 'px';
        flake.style.animationDuration = (2 + Math.random() * 4) + 's';
        flake.style.animationDelay = Math.random() * 5 + 's';
        elFxLayer.appendChild(flake);
    }
}

function applyWeatherEffect(weatherId) {
    clearEffects();
    if (weatherId >= 200 && weatherId < 300) {
        createRaindrops(40);
        var flash = document.createElement('div');
        flash.className = 'lightning-flash';
        elFxLayer.appendChild(flash);
    } else if (weatherId >= 300 && weatherId < 400) {
        createRaindrops(30);
    } else if (weatherId >= 500 && weatherId < 600) {
        createRaindrops(50);
    } else if (weatherId >= 600 && weatherId < 700) {
        createSnowflakes(30);
    } else if (weatherId === 800) {
        var glow = document.createElement('div');
        glow.className = 'sun-glow';
        document.body.appendChild(glow);
    }
}

// ==================== 搜索历史 ====================
var HISTORY_KEY = 'weather_hist_v3';
var MAX_HIST = 6;

function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch(e) { return []; }
}

function addHistory(city) {
    var h = getHistory();
    h = h.filter(function(c) { return c.toLowerCase() !== city.toLowerCase(); });
    h.unshift(city);
    h = h.slice(0, MAX_HIST);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    renderHistory();
}

function renderHistory() {
    var h = getHistory();
    if (h.length === 0) {
        elHistoryWrap.classList.remove('show');
        return;
    }
    elHistoryWrap.classList.add('show');
    elHistoryTags.innerHTML = h.map(function(c) {
        return '<span class="history-tag" data-city="' + c + '">' + c + '</span>';
    }).join('');

    elHistoryTags.querySelectorAll('.history-tag').forEach(function(tag) {
        tag.addEventListener('click', function() {
            elInput.value = this.dataset.city;
            doSearch(this.dataset.city);
        });
    });
}

elClearHist.addEventListener('click', function() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
});

// ==================== 搜索建议 ====================
var suggestTimer = null;
elInput.addEventListener('input', function() {
    clearTimeout(suggestTimer);
    var q = this.value.trim();
    if (q.length < 2) { elSuggestions.classList.remove('show'); return; }
    suggestTimer = setTimeout(function() { fetchSuggestions(q); }, 350);
});

document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-wrap')) elSuggestions.classList.remove('show');
});

elInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        elSuggestions.classList.remove('show');
        var q = this.value.trim();
        if (q) doSearch(q);
    }
});

function fetchSuggestions(q) {
    fetch(GEO_URL + '?q=' + encodeURIComponent(q) + '&limit=5&appid=' + API_KEY)
        .then(function(r) {
            if (!r.ok) throw new Error('fail');
            return r.json();
        })
        .then(function(data) {
            if (!data || data.length === 0) {
                // API无结果时使用本地建议
                showLocalSuggestions(q);
                return;
            }
            elSuggestions.innerHTML = data.map(function(item) {
                var name = (item.local_names && item.local_names.zh) ? item.local_names.zh : item.name;
                var region = item.state ? ', ' + item.state : '';
                return '<li data-lat="'+item.lat+'" data-lon="'+item.lon+'" data-name="'+name+'">' +
                    name + '<span style="color:#bbb;font-size:12px">' + region + ' ' + (item.country||'') + '</span></li>';
            }).join('');
            elSuggestions.classList.add('show');
            bindSuggestClick();
        })
        .catch(function() {
            showLocalSuggestions(q);
        });
}

// 本地建议列表（API不可用时使用）
var LOCAL_CITIES = [
    { name: '北京',    lat: 39.9042, lon: 116.4074, country: 'CN' },
    { name: '上海',    lat: 31.2304, lon: 121.4737, country: 'CN' },
    { name: '广州',    lat: 23.1291, lon: 113.2644, country: 'CN' },
    { name: '深圳',    lat: 22.5431, lon: 114.0579, country: 'CN' },
    { name: '成都',    lat: 30.5728, lon: 104.0668, country: 'CN' },
    { name: '杭州',    lat: 30.2741, lon: 120.1551, country: 'CN' },
    { name: '武汉',    lat: 30.5928, lon: 114.3055, country: 'CN' },
    { name: '西安',    lat: 34.3416, lon: 108.9398, country: 'CN' },
    { name: '南京',    lat: 32.0603, lon: 118.7969, country: 'CN' },
    { name: '重庆',    lat: 29.4316, lon: 106.9123, country: 'CN' },
    { name: 'Tokyo',   lat: 35.6762, lon: 139.6503, country: 'JP' },
    { name: 'London',  lat: 51.5074, lon: -0.1278,  country: 'GB' },
    { name: 'New York',lat: 40.7128, lon: -74.0060, country: 'US' },
    { name: 'Paris',   lat: 48.8566, lon: 2.3522,   country: 'FR' },
    { name: 'Sydney',  lat: -33.8688,lon: 151.2093, country: 'AU' },
];

function showLocalSuggestions(q) {
    var lower = q.toLowerCase();
    var matches = LOCAL_CITIES.filter(function(c) {
        return c.name.toLowerCase().indexOf(lower) !== -1;
    }).slice(0, 5);

    if (matches.length === 0) {
        elSuggestions.classList.remove('show');
        return;
    }
    elSuggestions.innerHTML = matches.map(function(c) {
        return '<li data-lat="'+c.lat+'" data-lon="'+c.lon+'" data-name="'+c.name+'">' +
            c.name + '<span style="color:#bbb;font-size:12px"> ' + c.country + '</span></li>';
    }).join('');
    elSuggestions.classList.add('show');
    bindSuggestClick();
}

function bindSuggestClick() {
    elSuggestions.querySelectorAll('li').forEach(function(li) {
        li.addEventListener('click', function() {
            elInput.value = this.dataset.name;
            elSuggestions.classList.remove('show');
            fetchAll(this.dataset.lat, this.dataset.lon, this.dataset.name);
        });
    });
}

// ==================== 定位 ====================
elLocateBtn.addEventListener('click', function() {
    if (!navigator.geolocation) { showError('浏览器不支持定位'); return; }
    showLoading('正在定位...');
    navigator.geolocation.getCurrentPosition(function(pos) {
        fetchAll(pos.coords.latitude, pos.coords.longitude, '当前位置');
    }, function(err) {
        var m = '定位失败';
        if (err.code === 1) m = '定位权限被拒绝，请在浏览器设置中允许';
        else if (err.code === 2) m = '无法获取位置信息';
        else if (err.code === 3) m = '定位超时，请重试';
        showError(m);
    }, { timeout: 12000, enableHighAccuracy: false });
});

// ==================== 搜索 ====================
function doSearch(city) {
    showLoading('正在搜索...');

    // 检查本地城市列表
    var localMatch = null;
    for (var i = 0; i < LOCAL_CITIES.length; i++) {
        if (LOCAL_CITIES[i].name.toLowerCase() === city.toLowerCase()) {
            localMatch = LOCAL_CITIES[i];
            break;
        }
    }

    fetch(GEO_URL + '?q=' + encodeURIComponent(city) + '&limit=1&appid=' + API_KEY)
        .then(function(r) {
            return r.json().then(function(d) { return { ok: r.ok, status: r.status, data: d }; });
        })
        .then(function(result) {
            // API密钥无效 → 使用备用数据
            if (result.status === 401) {
                console.log('API Key无效，使用模拟数据演示');
                throw new Error('USE_FALLBACK');
            }
            if (!result.ok) throw new Error('网络请求失败 (' + result.status + ')');
            var d = result.data;
            if (!Array.isArray(d) || d.length === 0) {
                // API找不到城市但本地有匹配
                if (localMatch) {
                    console.log('API未找到城市，使用本地坐标');
                    return fetchAll(localMatch.lat, localMatch.lon, localMatch.name);
                }
                throw new Error('未找到城市「' + city + '」');
            }
            var name = (d[0].local_names && d[0].local_names.zh) ? d[0].local_names.zh : d[0].name;
            return fetchAll(d[0].lat, d[0].lon, name);
        })
        .catch(function(err) {
            if (err.message === 'USE_FALLBACK') {
                // 使用模拟数据
                if (localMatch) {
                    useFallbackData(localMatch.name);
                } else {
                    useFallbackData(city);
                }
                return;
            }
            showError(err.message);
        });
}

// ==================== 核心：获取所有天气数据 ====================
function fetchAll(lat, lon, displayName) {
    showLoading('加载天气数据...');
    clearEffects();

    var weatherP  = fetch(WTH_URL + '?lat='+lat+'&lon='+lon+'&appid='+API_KEY+'&units=metric&lang=zh_cn');
    var forecastP = fetch(FCT_URL + '?lat='+lat+'&lon='+lon+'&appid='+API_KEY+'&units=metric&lang=zh_cn');
    var aqiP      = fetch(AQI_URL + '?lat='+lat+'&lon='+lon+'&appid='+API_KEY);

    Promise.all([weatherP, forecastP, aqiP])
        .then(function(resps) {
            // API密钥无效 → 使用备用数据
            if (resps[0].status === 401 || resps[0].status === 403) {
                throw new Error('USE_FALLBACK');
            }
            if (!resps[0].ok) throw new Error('天气数据获取失败 (' + resps[0].status + ')');

            return Promise.all([
                resps[0].json(),
                resps[1].ok ? resps[1].json() : Promise.resolve(null),
                resps[2].ok ? resps[2].json() : Promise.resolve(null)
            ]);
        })
        .then(function(data) {
            renderCurrent(data[0], displayName);
            if (data[1]) renderHourly(data[1]);
            if (data[1]) renderDaily(data[1]);
            if (data[2]) renderAQI(data[2]);
            elContent.classList.add('show');
            addHistory(displayName);
            hideToast();
        })
        .catch(function(err) {
            if (err.message === 'USE_FALLBACK') {
                useFallbackData(displayName);
            } else {
                showError(err.message);
            }
        });
}

// ==================== 备用模拟数据 ====================
// 当API Key不可用时，使用模拟数据展示应用功能
function useFallbackData(cityName) {
    clearEffects();
    hideToast();

    // 根据城市名生成一个伪随机种子
    var seed = 0;
    for (var i = 0; i < cityName.length; i++) {
        seed += cityName.charCodeAt(i);
    }

    // 预设几种天气场景，根据城市名选择
    var scenarios = [
        { id: 800, icon: '01d', desc: '晴',      temp: 28, feels: 29,  hi: 31, lo: 22, hum: 45, wind: 2.1, windDeg: 180, press: 1013, vis: 10000, sr: '05:48', ss: '19:38', aqiLv: 2, pm25: 28, pm10: 52, o3: 68, no2: 22 },
        { id: 801, icon: '02d', desc: '少云',    temp: 26, feels: 27,  hi: 29, lo: 21, hum: 52, wind: 3.4, windDeg: 225, press: 1011, vis: 9000,  sr: '05:50', ss: '19:35', aqiLv: 2, pm25: 35, pm10: 60, o3: 72, no2: 28 },
        { id: 802, icon: '03d', desc: '多云',    temp: 24, feels: 25,  hi: 27, lo: 20, hum: 60, wind: 2.8, windDeg: 140, press: 1015, vis: 8500,  sr: '05:52', ss: '19:32', aqiLv: 3, pm25: 55, pm10: 85, o3: 90, no2: 35 },
        { id: 500, icon: '10d', desc: '小雨',    temp: 21, feels: 20,  hi: 24, lo: 18, hum: 78, wind: 4.2, windDeg: 315, press: 1008, vis: 6000,  sr: '05:55', ss: '19:28', aqiLv: 1, pm25: 15, pm10: 30, o3: 45, no2: 15 },
        { id: 300, icon: '09d', desc: '毛毛雨',  temp: 19, feels: 18,  hi: 22, lo: 17, hum: 82, wind: 3.8, windDeg: 270, press: 1009, vis: 7000,  sr: '05:53', ss: '19:30', aqiLv: 1, pm25: 18, pm10: 35, o3: 50, no2: 18 },
        { id: 200, icon: '11d', desc: '雷阵雨',  temp: 23, feels: 22,  hi: 26, lo: 19, hum: 85, wind: 5.5, windDeg: 200, press: 1005, vis: 5000,  sr: '05:56', ss: '19:25', aqiLv: 1, pm25: 12, pm10: 25, o3: 40, no2: 10 },
        { id: 600, icon: '13d', desc: '小雪',    temp: -2, feels: -5,  hi: 1,  lo: -6, hum: 72, wind: 3.0, windDeg: 350, press: 1020, vis: 4000,  sr: '06:10', ss: '18:50', aqiLv: 2, pm25: 30, pm10: 50, o3: 55, no2: 25 },
        { id: 701, icon: '50d', desc: '雾',      temp: 16, feels: 15,  hi: 19, lo: 13, hum: 90, wind: 1.5, windDeg: 90,  press: 1018, vis: 1500,  sr: '05:58', ss: '19:22', aqiLv: 4, pm25: 110,pm10: 150,o3: 100,no2: 55 },
    ];

    var sc = scenarios[seed % scenarios.length];

    // 构造API格式数据
    var now = Math.floor(Date.now() / 1000);
    var mockWeather = {
        weather: [{ id: sc.id, icon: sc.icon, description: sc.desc, main: '' }],
        main: {
            temp: sc.temp, feels_like: sc.feels, temp_min: sc.lo, temp_max: sc.hi,
            humidity: sc.hum, pressure: sc.press
        },
        wind: { speed: sc.wind, deg: sc.windDeg },
        sys: { country: '', sunrise: now - 21600, sunset: now + 21600 },
        visibility: sc.vis,
        dt: now,
        name: cityName,
        _fallback: true
    };

    // 模拟逐小时数据
    var mockHourlyItems = [];
    var baseHour = new Date().getHours() + 1;
    for (var h = 0; h < 8; h++) {
        var hourTemp = sc.temp + Math.round((Math.random() - 0.5) * 4);
        mockHourlyItems.push({
            dt: now + h * 3600,
            main: { temp: hourTemp },
            weather: [{ icon: sc.icon, description: sc.desc }],
            pop: Math.random() * 0.3
        });
    }

    // 模拟每日数据
    var mockDailyItems = [];
    for (var d = 0; d < 5; d++) {
        var dayOffset = (Math.random() - 0.5) * 4;
        var hi = sc.hi + Math.round(dayOffset);
        var lo = sc.lo + Math.round(dayOffset);
        var icons = ['01d','02d','03d','04d','10d'];
        var iconPick = icons[(seed + d) % icons.length];
        for (var slot = 0; slot < 8; slot++) {
            mockDailyItems.push({
                dt: now + d * 86400 + slot * 10800,
                main: { temp: lo + Math.random() * (hi - lo) },
                weather: [{ icon: iconPick, description: sc.desc, id: sc.id }]
            });
        }
    }

    // 模拟AQI数据
    var mockAQI = {
        list: [{
            main: { aqi: sc.aqiLv },
            components: { pm2_5: sc.pm25, pm10: sc.pm10, o3: sc.o3, no2: sc.no2 }
        }]
    };

    // 渲染
    renderCurrent(mockWeather, cityName);
    renderHourly({ list: mockHourlyItems });
    renderDaily({ list: mockDailyItems });
    renderAQI(mockAQI);
    elContent.classList.add('show');
    addHistory(cityName);

    // 触发天气特效
    applyWeatherEffect(sc.id);
    document.body.className = 'theme-' + getTheme(sc.id);

    // 提示使用模拟数据
    console.log('当前显示「' + cityName + '」的模拟数据（API Key未激活）');
}

// ==================== 渲染：当前天气 ====================
function renderCurrent(data, displayName) {
    var w    = data.weather[0];
    var main = data.main;
    var wind = data.wind;
    var sys  = data.sys;
    var vis  = data.visibility;

    // 主题 & 特效
    var theme = getTheme(w.id);
    document.body.className = 'theme-' + theme;
    if (!data._fallback) applyWeatherEffect(w.id);

    // 基本信息
    $('cityName').textContent    = displayName + (sys.country ? ', ' + sys.country : '');
    $('weatherDesc').textContent = w.description;
    $('updateTime').textContent  = data._fallback ? '演示数据' : '更新于 ' + fmtTime(data.dt);

    // 图标 & 温度
    $('weatherIcon').src = ICON_URL + w.icon + '@2x.png';
    $('temperature').textContent = Math.round(main.temp) + '°';

    // 体感 & 高低温
    $('feelsLikeTag').textContent = '体感 ' + Math.round(main.feels_like) + '°';
    $('hiloTag').textContent = Math.round(main.temp_max) + '° / ' + Math.round(main.temp_min) + '°';

    // 详情
    $('humidity').textContent   = main.humidity + '%';
    $('windSpeed').textContent  = wind.speed + ' m/s';
    $('windDir').textContent    = wind.deg !== undefined ? getWindDir(wind.deg) + '风' : '风速';
    $('pressure').textContent   = main.pressure + ' hPa';
    $('visibility').textContent = vis ? (vis / 1000).toFixed(1) + ' km' : '--';
    $('sunrise').textContent    = fmtTime(sys.sunrise);
    $('sunset').textContent     = fmtTime(sys.sunset);
}

// ==================== 渲染：逐小时预报 ====================
function renderHourly(data) {
    var items = data.list.slice(0, 8);
    $('hourlyList').innerHTML = items.map(function(item) {
        var pop = item.pop ? Math.round(item.pop * 100) : 0;
        return '<div class="hourly-item">' +
            '<div class="h-time">' + fmtHour(item.dt) + '</div>' +
            '<img class="h-icon" src="' + ICON_URL + item.weather[0].icon + '@2x.png" alt="">' +
            '<div class="h-temp">' + Math.round(item.main.temp) + '°</div>' +
            (pop > 0 ? '<div class="h-pop">💧' + pop + '%</div>' : '') +
            '</div>';
    }).join('');
    $('hourlyCard').style.display = 'block';
}

// ==================== 渲染：每日预报 ====================
function renderDaily(data) {
    var dayMap = {};
    data.list.forEach(function(item) {
        var ds = new Date(item.dt * 1000).toDateString();
        if (!dayMap[ds]) {
            dayMap[ds] = { dt: item.dt, temps: [], icons: [], descs: [] };
        }
        dayMap[ds].temps.push(item.main.temp);
        dayMap[ds].icons.push(item.weather[0].icon);
        dayMap[ds].descs.push(item.weather[0].description);
    });

    var days = Object.values(dayMap).slice(0, 5);

    var allTemps = [];
    days.forEach(function(d) { allTemps = allTemps.concat(d.temps); });
    var globalMin = Math.min.apply(null, allTemps);
    var globalMax = Math.max.apply(null, allTemps);
    var range = globalMax - globalMin || 1;

    $('dailyList').innerHTML = days.map(function(d) {
        var hi   = Math.round(Math.max.apply(null, d.temps));
        var lo   = Math.round(Math.min.apply(null, d.temps));
        var mid  = Math.floor(d.icons.length / 2);
        var icon = d.icons[mid];

        var leftPct  = ((lo - globalMin) / range) * 100;
        var widthPct = ((hi - lo) / range) * 100;
        if (widthPct < 8) widthPct = 8;

        return '<div class="daily-item">' +
            '<span class="d-day">' + fmtDateCN(d.dt) + '</span>' +
            '<img class="d-icon" src="' + ICON_URL + icon + '@2x.png" alt="">' +
            '<span class="d-desc">' + d.descs[mid] + '</span>' +
            '<div class="d-bar-wrap"><div class="d-bar-fill" style="left:'+leftPct+'%;width:'+widthPct+'%"></div></div>' +
            '<span class="d-hilo">' + hi + '°<span class="d-lo">/' + lo + '°</span></span>' +
            '</div>';
    }).join('');
    $('dailyCard').style.display = 'block';
}

// ==================== 渲染：空气质量 ====================
function renderAQI(data) {
    if (!data.list || data.list.length === 0) {
        $('aqiCard').style.display = 'none';
        return;
    }
    var aqi = data.list[0];
    var comp = aqi.components;
    var level = aqi.main.aqi;

    var labels = ['','优','良','轻度','中度','重度'];
    var colors = ['','lv1','lv2','lv3','lv4','lv5'];
    var badge = $('aqiBadge');
    badge.textContent = labels[level] || '--';
    badge.className = 'aqi-badge ' + (colors[level] || 'lv1');

    $('aqiPM25').textContent = (comp.pm2_5 !== undefined) ? comp.pm2_5.toFixed(1) + ' μg/m³' : '--';
    $('aqiPM10').textContent = (comp.pm10  !== undefined) ? comp.pm10.toFixed(1)  + ' μg/m³' : '--';
    $('aqiO3').textContent   = (comp.o3    !== undefined) ? comp.o3.toFixed(1)    + ' μg/m³' : '--';
    $('aqiNO2').textContent  = (comp.no2   !== undefined) ? comp.no2.toFixed(1)   + ' μg/m³' : '--';
    $('aqiCard').style.display = 'block';
}

// ==================== 初始化 ====================
(function init() {
    renderHistory();
    // 页面打开不自动搜索，展示简洁的初始状态
    // 用户输入城市名后点击搜索即可查看天气
})();
