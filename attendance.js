import { google } from 'googleapis';

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
const spreadsheetId = '1iAV_Fr4zhyqL6gPe3AcV_rspZglRBmk-5xn_1lpEThY';

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth.getClient();
}

export default async function handler(req, res) {
  const authClient = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  if (req.method === 'GET') {
    // Fetch student names and attendance data
    try {
      const namesRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'B6:B43',
      });
      const dateHeadersRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'C1:Z1',
      });
      const attendanceRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'C6:Z43',
      });

      res.status(200).json({
        names: namesRes.data.values ? namesRes.data.values.flat() : [],
        headers: dateHeadersRes.data.values ? dateHeadersRes.data.values[0] : [],
        records: attendanceRes.data.values || [],
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  else if (req.method === 'POST') {
    const { username, password, date, attendance } = req.body;
    // Simple auth check
    if (username !== 'admin' || password !== 'admin@123') {
      return res.status(401).json({ status: 'error', reason: 'auth' });
    }
    try {
      // Fetch existing dates to find date column or append date
      const headerRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'C1:Z1',
      });
      let headers = headerRes.data.values ? headerRes.data.values[0] : [];
      let colIndex = headers.indexOf(date);
      if (colIndex === -1) {
        // Append new date header at next column (e.g., after last column)
        headers.push(date);
        const columnLetter = String.fromCharCode(67 + headers.length - 1); // 'C' is 67 in ASCII
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `C1:${columnLetter}1`,
          valueInputOption: 'RAW',
          requestBody: { values: [headers] },
        });
        colIndex = headers.length - 1;
      }

      // Write attendance vertically for rows 6 to 43 in column corresponding to date
      // Attendance start range
      const colLetter = String.fromCharCode(67 + colIndex); 
      const range = `${colLetter}6:${colLetter}43`;

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values: attendance.map(a => [a]) }, // Each attendance as array for a row
      });

      return res.status(200).json({ status: 'success' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
  
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
