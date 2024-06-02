const axios = require('axios');
const readline = require('readline-sync');
const moment = require('moment-timezone');
const fs = require('fs');

const now = moment().tz("Asia/Jakarta").format("HH:mm:ss");

function loadSession() {
  try {
    const sessionData = fs.readFileSync('session.json');
    return JSON.parse(sessionData);
  } catch (error) {
    console.error('Session JSON tidak ditemukan.');
    console.log('Membuat file session baru...');
    saveSession({ sessions: {} });
    return { sessions: {} };
  }
}

function saveSession(session) {
  try {
    fs.writeFileSync('session.json', JSON.stringify(session));
    console.log('Session disimpan.');
  } catch (error) {
    console.error('Error saving session:', error);
  }
}

function getNewSessionInput() {
  const name = readline.question(`[ ${now} ] Nama Session: `);
  const token = readline.question(`[ ${now} ] Token: `);
  const baggage = readline.question(`[ ${now} ] Baggage: `);
  const sentryTrace = readline.question(`[ ${now} ] Sentry-Trace: `);
  const tapLevel = readline.questionInt(`[ ${now} ] Tap Level: `);

  return { name, token, tapLevel, baggage, sentryTrace };
}

async function loadState(token, tapLevel, baggage, sentryTrace) {
  let clicks, max_value, user_id;

  try {
    const response = await axios.post(
      'https://app.firecoin.app/.netlify/functions/loadState',
      {},
      {
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          'Authorization': token,
          'Baggage': baggage,
          'Content-Type': 'text/plain;charset=UTF-8',
          'Origin': 'https://app.firecoin.app',
          'Priority': 'u=1, i',
          'Referer': 'https://app.firecoin.app/',
          'Sec-Ch-Ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'Sentry-Trace': sentryTrace,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        }
      }
    );

    const data = response.data;
    clicks = data.clicks + tapLevel;
    max_value = data.wood.max_value;
    user_id = data.user_id;

  } catch (error) {
    console.error('Error:', error);
  }

  return { clicks, max_value, user_id };
}


async function sendClick(clicks, token, tapLevel, baggage, sentryTrace) {
    try {
      const totalClicks = clicks + tapLevel;
      const response = await axios.post(
        'https://app.firecoin.app/.netlify/functions/click',
        { clicks: totalClicks },
        { headers: {
            'Accept': '*/*',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'Authorization': token,
            'Baggage': baggage,
            'Content-Type': 'text/plain;charset=UTF-8',
            'Origin': 'https://app.firecoin.app',
            'Priority': 'u=1, i',
            'Referer': 'https://app.firecoin.app/',
            'Sec-Ch-Ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Sentry-Trace': sentryTrace,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
          }
        }
      );
  
      const responseData = response.data;
      const { nextUser } = responseData;
  
      return { responseData, nextUser };
    } catch (error) {
      console.error('Error:', error);
      return null; 
    }
  }

(async () => {
  let session = loadSession();
  let shouldExit = false;

  while (!shouldExit) {
    console.log("Apakah ingin menggunakan session yang ada, menambah session baru, atau keluar?");
    const options = ["Gunakan session yang ada", "Tambah session baru", "Keluar"];
    const choiceIndex = readline.keyInSelect(options, "Pilih opsi:");

    switch (choiceIndex) {
      case 0: 
        console.log("Menggunakan session yang ada.");
        const sessionNames = Object.keys(session.sessions);
        const sessionIndex = readline.keyInSelect(sessionNames, "Pilih session yang akan digunakan:");
        if (sessionIndex !== -1) {
          const selectedSession = session.sessions[sessionNames[sessionIndex]];
          await runSession(selectedSession);
        } else {
          console.log("Keluar dari program.");
          shouldExit = true;
        }
        break;
      
      case 1: 
        console.log("Tambah session baru.");
        const newSession = getNewSessionInput();
        session.sessions[newSession.name] = newSession;
        saveSession(session);
        await runSession(newSession);
        break;

      case 2: 
        console.log("Keluar dari program.");
        shouldExit = true;
        break;

      default:
        console.log("Pilihan tidak valid.");
        break;
    }
  }
})();
async function runSession(session) {
  const { token, tapLevel, baggage, sentryTrace } = session;

  const state = await loadState(token, tapLevel, baggage, sentryTrace);

  if (state !== undefined) {
    let { clicks, max_value, user_id } = state;

    let consoleLogged = false; 
    while (true) {
      if (!consoleLogged) { 
        console.log(`[ info ] Clicks: ${clicks} | Max Value: ${max_value} | User ID: ${user_id}`);
        consoleLogged = true; 
      }

      const { responseData, nextUser } = await sendClick(clicks, token, tapLevel, baggage, sentryTrace);

      if (responseData !== null) {
        const { clicks: newClicks, max_value: newMaxValue, user_id } = responseData;
        console.log(`[sess :  ${session.name}  ] [ success ] Next User: | ID: ${nextUser.id} | Name: ${nextUser.name} | Passed: ${nextUser.passed} [ Clicks: ${nextUser.clicks} ] ./ilditf`);
      }

      clicks += tapLevel;
      const delay = max_value === 0 ? 60000 : 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      const newState = await loadState(token, tapLevel, baggage, sentryTrace);
      if (newState !== undefined) {
        const { clicks: newClicks, max_value: newMaxValue, user_id } = newState;
      }
    }
  }
}
