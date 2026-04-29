import { google } from 'googleapis'

const SPREADSHEET_ID = '1paJ8xUhOuk0W9MliO5l0KhdKaM_d2KfR8TZBosKJMuE'

let sheetsApi

function getSheets() {
  if (!sheetsApi) {
    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}')
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    sheetsApi = google.sheets({ version: 'v4', auth })
  }
  return sheetsApi
}

export async function getRows(sheet) {
  const res = await getSheets().spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A:Z`,
  })
  const rows = res.data.values || []
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1).map((row, idx) => {
    const obj = { _rowIndex: idx + 2 }
    headers.forEach((h, i) => { obj[h] = row[i] || '' })
    return obj
  })
}

export async function appendRow(sheet, data) {
  const headers = await getHeaders(sheet)
  const row = headers.map(h => data[h] !== undefined ? String(data[h]) : '')
  await getSheets().spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A:Z`,
    valueInputOption: 'RAW',
    body: { values: [row] },
  })
}

export async function updateRow(sheet, rowIndex, data) {
  const headers = await getHeaders(sheet)
  const row = headers.map(h => data[h] !== undefined ? String(data[h]) : '')
  await getSheets().spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A${rowIndex}`,
    valueInputOption: 'RAW',
    body: { values: [row] },
  })
}

export async function deleteRows(sheet, rowIndices) {
  if (rowIndices.length === 0) return
  const ss = await getSheets().spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const sheetObj = ss.data.sheets.find(s => s.properties.title === sheet)
  if (!sheetObj) return
  const sheetId = sheetObj.properties.sheetId
  const sorted = [...rowIndices].sort((a, b) => b - a)
  const requests = sorted.map(ri => ({
    deleteDimension: {
      range: { sheetId, dimension: 'ROWS', startIndex: ri - 1, endIndex: ri }
    }
  }))
  await getSheets().spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    body: { requests },
  })
}

export async function nextId(sheet) {
  const rows = await getRows(sheet)
  if (rows.length === 0) return 1
  const ids = rows.map(r => parseInt(r.id) || 0)
  return Math.max(...ids) + 1
}

async function getHeaders(sheet) {
  const res = await getSheets().spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!1:1`,
  })
  return (res.data.values || [[]])[0]
}

export function parseJSON(val) {
  if (!val) return []
  try { return JSON.parse(val) } catch { return [] }
}

export function toInt(val) {
  return parseInt(val) || 0
}
