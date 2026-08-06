const excelToJson = require('convert-excel-to-json');
const excelJS = require('exceljs');
const Project = require('../project/project');

/**
 * Reads a sheet out of an uploaded buffer.
 * Returns [] when the sheet is missing rather than throwing, so a
 * wrongly-named tab produces a clear "0 imported" result.
 */
function parseSheet(buffer, sheetName, columnToKey) {
  const parsed = excelToJson({
    source: buffer,
    sheets: [{ name: sheetName, header: { rows: 1 }, columnToKey }],
  });
  return parsed[sheetName] || [];
}

/**
 * Upserts rows keyed by `ip`, resolving the `project` column from a name to an id.
 *
 * Every row is awaited before responding. The previous implementation fired
 * un-awaited promises inside a loop and replied "success" before a single write
 * had run, so a typo in a project name surfaced as an unhandled rejection in the
 * logs while the client was told the import had worked.
 */
async function importByIp(Model, rows) {
  const result = { imported: 0, errors: [] };
  if (!rows.length) return result;

  // Resolve each distinct project name once instead of per row.
  const names = [...new Set(rows.map((r) => r.project).filter(Boolean))];
  const projects = await Project.find({ nom: { $in: names } }).lean();
  const projectByName = new Map(projects.map((p) => [p.nom, p._id]));

  const operations = [];
  for (const [index, row] of rows.entries()) {
    const line = index + 2; // header occupies row 1

    if (!row.ip || !row.nom) {
      result.errors.push(`Ligne ${line} : 'ip' et 'nom' sont obligatoires`);
      continue;
    }

    const update = { ...row };
    if (row.project) {
      const projectId = projectByName.get(row.project);
      if (!projectId) {
        result.errors.push(`Ligne ${line} : projet « ${row.project} » introuvable`);
        continue;
      }
      update.project = projectId;
    } else {
      delete update.project;
    }

    operations.push({
      updateOne: {
        filter: { ip: String(row.ip).trim() },
        update: { $set: update },
        upsert: true,
      },
    });
  }

  if (operations.length) {
    const written = await Model.bulkWrite(operations, { ordered: false });
    result.imported = (written.upsertedCount || 0) + (written.modifiedCount || 0);
  }

  return result;
}

/** Streams a worksheet to the response as an .xlsx attachment. */
async function sendWorkbook(res, { sheetName, columns, rows, filename }) {
  const workbook = new excelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.columns = columns;
  worksheet.addRows(rows);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { parseSheet, importByIp, sendWorkbook };
