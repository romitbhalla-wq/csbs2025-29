const API_URL = '/api/attendance'; // <-- put your Apps Script web app URL here
let names = [], attendance = [], dateHeaders = [], records = [], currentDate = '', loadedDate = '';

// Show login > admin only
function login() {
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value;
  if(user === 'admin' && pass === 'admin@123') {
    sessionStorage.setItem('auth', 'ok');
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-section').style.display = '';
    loadData();
  } else {
    document.getElementById('login-err').textContent = 'Invalid credentials.';
  }
}
function logout() {
  sessionStorage.removeItem('auth');
  location.reload();
}

window.onload = function() {
  if(sessionStorage.getItem('auth')==='ok') {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-section').style.display = '';
    loadData();
  }
}

async function loadData() {
  const res = await fetch(API_URL);
  const dat = await res.json();
  names = dat.names;
  dateHeaders = dat.headers;
  records = dat.records;

  // Set date input

  const today = (new Date()).toISOString().slice(0,10);
  document.getElementById('date-picker').value = today;
  document.getElementById('date-picker').onchange = renderTable;
  renderTable();
}

function renderTable() {
  const table = document.querySelector('#students-table tbody');
  table.innerHTML = '';
  let date = document.getElementById('date-picker').value;
  document.getElementById('selected-date').textContent = 'Selected date: '+date;
  currentDate = date;
  // Find col for this date, else mark as unmarked
  let colIdx = dateHeaders.indexOf(date);
  attendance = [];
  for(let i=0; i<names.length; i++) {
    let stat = (colIdx !== -1)? records[i][colIdx] : '';
    let pSel = stat==='P';
    let aSel = stat==='A';
    attendance.push(stat||'');
    table.innerHTML += `<tr>
      <td>${i+1}</td>
      <td>${names[i]}</td>
      <td><button class="btn btn-present${pSel?' selected':''}" onclick="mark(${i},'P',this)">P</button></td>
      <td><button class="btn btn-absent${aSel?' selected':''}" onclick="mark(${i},'A',this)">A</button></td>
      <td><span class="fw-bold">${stat||'-'}</span></td>
    </tr>`;
  }
}

function mark(idx, val, btn) {
  attendance[idx] = val;
  // color selected button in row
  const row = btn.closest('tr');
  [...row.querySelectorAll('button')].forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  // update status display
  row.querySelector('td:last-child span').textContent = val;
}

async function submitAttendance() {
  // Must have all filled
  if(!attendance.every(x=>x==='P'||x==='A')) {
    document.getElementById('success-msg').textContent = "Mark all students (P/A) first!";
    return;
  }
  // Save
  const payload = {
    username:'admin', password:'admin@123',
    date: currentDate,
    attendance
  };
  document.getElementById('save-btn').disabled = true;
  let resp = await fetch(API_URL, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  let result = await resp.json();
  document.getElementById('save-btn').disabled = false;
  if(result.status==='success') {
    document.getElementById('success-msg').textContent = 'Attendance saved!';
    await loadData(); // reload from sheet
  } else {
    document.getElementById('success-msg').textContent = 'Error: '+(result.reason||'try again');
  }
}
